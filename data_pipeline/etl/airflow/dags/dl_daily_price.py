from datetime import datetime, timedelta

from airflow.decorators import dag

from function.datalake_df2csv import DfToCsvOperator

default_args = {
    "owner": "airflow",
    "retries": 4,
    "retry_delay": timedelta(minutes=3),
    "execution_timeout": timedelta(minutes=10),  # Much shorter timeout since it runs fast now
}

MINIO_BUCKET = "thongtin-congty-va-bctc"
MINIO_CONN_ID = "minio_finance"


@dag(
    dag_id="daily_price",
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule_interval="0 16 * * 1-5",  # 16:00 từ thứ 2-6 (sau giờ đóng cửa thị trường)
    catchup=False,
    tags=["vnstock", "finance", "price", "daily"],
    description="Lấy dữ liệu giá chứng khoán trong ngày hiện tại và lưu vào MinIO",
)
def daily_price_minio_dag():
    
    ingest_daily_price = DfToCsvOperator(
        task_id="ingest_daily_price",
        logic_file="daily_price",
        df_name="get_daily_price",
        bucket_name=MINIO_BUCKET,
        object_path="daily_price/{{ ds }}/all_prices.csv",
        conn_id=MINIO_CONN_ID,
        op_kwargs={"target_date": "{{ ds }}"},
    )

daily_price_minio_dag()
