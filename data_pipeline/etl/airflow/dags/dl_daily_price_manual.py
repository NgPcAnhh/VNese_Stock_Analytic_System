from datetime import datetime, timedelta
from airflow import DAG
from airflow.decorators import task
from airflow.models import Param, Variable
from function.datalake_df2csv import DfToCsvOperator

default_args = {
    "owner": "airflow",
    "retries": 3,
    "retry_delay": timedelta(minutes=2),
    "execution_timeout": timedelta(minutes=15),
}

MINIO_BUCKET = "thongtin-congty-va-bctc"
MINIO_CONN_ID = "minio_finance"

with DAG(
    dag_id="daily_price_manual",
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule_interval=None,  # Manual trigger only
    catchup=False,
    tags=["vnstock", "finance", "price", "manual"],
    description="Tải dữ liệu giá chứng khoán của 1 ngày cụ thể và lưu vào MinIO + Database",
    params={
        "target_date": Param(
            default=datetime.now().strftime("%Y-%m-%d"),
            type="string",
            format="date",
            description="Ngày cụ thể muốn lấy dữ liệu giá (Định dạng YYYY-MM-DD)"
        )
    }
) as dag:
    
    ingest_manual_price = DfToCsvOperator(
        task_id="ingest_manual_price",
        logic_file="daily_price",
        df_name="get_daily_price",
        bucket_name=MINIO_BUCKET,
        object_path="history_price/{{ params.target_date }}/all_prices.csv",
        conn_id=MINIO_CONN_ID,
        op_kwargs={"target_date": "{{ params.target_date }}"},
    )

    @task(task_id="sync_manual_price_to_db")
    def sync_manual_price_to_db(target_date: str, **context):
        from lake_to_dwh.sync_daily_price import sync_daily_price_to_db
        
        db_url = Variable.get(
            "dwh_db_url",
            default_var="postgresql+psycopg2://admin:123456@dwh-postgres:5432/postgres"
        )
        schema = Variable.get(
            "dwh_schema",
            default_var="hethong_phantich_chungkhoan"
        )
        
        partition_path = f"history_price/{target_date}/"
        print(f"[sync_manual_price_to_db] Syncing partition: {partition_path} to DB...")
        
        result = sync_daily_price_to_db(
            db_url=db_url,
            schema=schema,
            bucket=MINIO_BUCKET,
            minio_conn_id=MINIO_CONN_ID,
            target_partition=partition_path
        )
        print(f"[sync_manual_price_to_db] Result: {result}")
        return result

    sync_task = sync_manual_price_to_db(target_date="{{ params.target_date }}")

    ingest_manual_price >> sync_task
