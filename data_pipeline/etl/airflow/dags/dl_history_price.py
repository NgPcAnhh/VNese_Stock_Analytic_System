from datetime import datetime, timedelta

from airflow.decorators import dag, task
from airflow.models.baseoperator import chain

from function.datalake_df2csv import DfToCsvOperator

default_args = {
    "owner": "airflow",
    "retries": 2,
    "retry_delay": timedelta(minutes=10),
    "execution_timeout": timedelta(minutes=60),
}

MINIO_BUCKET = "thongtin-congty-va-bctc"
MINIO_CONN_ID = "minio_finance"


@dag(
    dag_id="history_price",
    default_args=default_args,
    start_date=datetime(2023, 1, 1),
    schedule_interval="@daily",
    catchup=False,
    tags=["vnstock", "finance", "price"],
    params={
        "start_date": "2026-01-01",  # Ngày bắt đầu lấy dữ liệu (hoặc 'auto' để tự động tối ưu hóa)
        "end_date": None,  # None = đến hôm nay
    },
)
def history_price_dag():
    @task
    def get_batches(**context):
        from logic.list_macp import get_ticker_batches

        # Lấy start_date và end_date từ params
        start_date = context["params"].get("start_date", "2026-01-01")
        end_date = context["params"].get("end_date")

        # Xác định dùng price_board (chạy nhanh) cho các run tự động hoặc auto
        run_type = context["dag_run"].run_type
        use_price_board = (run_type == "scheduled" or start_date == "auto")

        if use_price_board:
            target_date = datetime.now().strftime("%Y-%m-%d")
            start_date = target_date
            end_date = target_date
            print(f"[history_price] Scheduled or auto run. Using fast price_board logic for target_date: {target_date}")
        else:
            print(f"[history_price] Manual run (backfill). Fetching history from {start_date} to {end_date or 'today'} via ThreadPool...")

        # Tăng batch_size lên 500 để giảm số lượng mapped tasks từ 75 xuống còn ~3 tasks
        # Giúp loại bỏ hoàn toàn chi phí lập lịch/startup overhead của Airflow
        return [
            {
                "symbols": batch,
                "start_date": start_date,
                "end_date": end_date,
                "use_price_board": use_price_board,
            }
            for batch in get_ticker_batches(batch_size=500)
        ]

    batches = get_batches()

    ingest_history = DfToCsvOperator.partial(
        task_id="ingest_history_price",
        logic_file="history_price",
        df_name="get_history_price_batch",
        bucket_name=MINIO_BUCKET,
        object_path="history_price/{{ ds }}/batch_{{ ti.map_index }}.csv",
        conn_id=MINIO_CONN_ID,
        max_active_tis_per_dagrun=3,  # Chạy đồng thời tối đa 3 task song song
    ).expand(op_kwargs=batches)

    chain(batches, ingest_history)


history_price_dag()