from datetime import datetime, timedelta

from airflow.decorators import dag, task
from airflow.models.baseoperator import chain

from function.datalake_df2csv import DfToCsvOperator

default_args = {
    "owner": "airflow",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

MINIO_BUCKET = "thongtin-congty-va-bctc"
MINIO_CONN_ID = "minio_finance"


@dag(
    dag_id="electric_board_daily",
    default_args=default_args,
    start_date=datetime(2026, 1, 1),
    schedule_interval="0 15 * * 1-5",  # 15:00 thứ 2-6
    catchup=False,
    tags=["vnstock", "finance", "electric_board", "daily"],
    description="Lấy dữ liệu bảng giá giao dịch cuối ngày và lưu vào MinIO",
)
def electric_board_daily_dag():
    # Sử dụng DfToCsvOperator để lấy dữ liệu và upload lên MinIO
    ingest_electric_board = DfToCsvOperator(
        task_id="ingest_electric_board",
        logic_file="electric_board",
        df_name="get_electric_board_all",
        bucket_name=MINIO_BUCKET,
        object_path="electric_board_per_day/{{ ds }}/all_prices.csv",
        conn_id=MINIO_CONN_ID,
        op_kwargs={"target_date": "{{ ds }}"},
    )


electric_board_daily_dag()
