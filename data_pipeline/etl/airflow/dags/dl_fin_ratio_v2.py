from __future__ import annotations

import io
from datetime import datetime, timedelta

import pandas as pd
from airflow.decorators import dag, task
from airflow.models import Variable
from airflow.providers.amazon.aws.hooks.s3 import S3Hook

from logic.fin_ratio_v2 import load_tickers, crawl_vietstock_eps_bvps, crawl_24hmoney_indicators


MINIO_BUCKET = Variable.get("minio_bucket", default_var="thongtin-congty-va-bctc")
MINIO_CONN_ID = "minio_finance"


def _save_to_minio(df: pd.DataFrame, object_key: str) -> str:
    csv_bytes = df.to_csv(index=False).encode("utf-8-sig")

    hook = S3Hook(aws_conn_id=MINIO_CONN_ID)
    if not hook.check_for_bucket(MINIO_BUCKET):
        hook.create_bucket(bucket_name=MINIO_BUCKET)

    hook.load_bytes(
        bytes_data=csv_bytes,
        key=object_key,
        bucket_name=MINIO_BUCKET,
        replace=True,
    )
    return object_key


@dag(
    dag_id="fin_ratio_v2",
    start_date=datetime(2026, 1, 1),
    schedule="0 17 * * *",  # Daily at 17:00 (5:00 PM)
    catchup=False,
    max_active_runs=1,
    default_args={
        "owner": "airflow",
        "retries": 2,
        "retry_delay": timedelta(minutes=3),
    },
    tags=["vnstock", "fin-ratio", "all-in-one", "minio"],
    description="Financial ratio v2 DAG: scrape Vietstock/24hmoney in parallel, calculate ratios, save MinIO",
)
def fin_ratio_v2_dag():
    @task
    def get_partition_folder() -> str:
        now = datetime.utcnow()
        return f"{now.strftime('%Y-%m-%d_%H:%M:%S')}:{int(now.microsecond / 1000):03d}"

    @task(task_id="scrape_vietstock")
    def task_scrape_vietstock() -> list[dict]:
        max_tickers = 0
        vietstock_workers = 8
        vietstock_wait_seconds = 5
        vietstock_retries = 2

        tickers = load_tickers(max_tickers=max_tickers)

        print("=" * 80)
        print("FIN_RATIO_V2 VIETSTOCK SCRAPE START")
        print(f"tickers={len(tickers)}")
        print("=" * 80)

        vietstock_df = crawl_vietstock_eps_bvps(
            tickers=tickers,
            workers=vietstock_workers,
            wait_seconds=vietstock_wait_seconds,
            retries=vietstock_retries,
        )

        if vietstock_df.empty:
            raise ValueError("No rows scraped from Vietstock")

        return vietstock_df.to_dict(orient="records")

    @task(task_id="scrape_24hmoney")
    def task_scrape_24hmoney() -> list[dict]:
        max_tickers = 0
        vietstock_workers = 8
        vietstock_retries = 2

        tickers = load_tickers(max_tickers=max_tickers)

        print("=" * 80)
        print("FIN_RATIO_V2 24HMONEY SCRAPE START")
        print(f"tickers={len(tickers)}")
        print("=" * 80)

        indicators_df = crawl_24hmoney_indicators(
            tickers=tickers,
            workers=vietstock_workers,
            retries=vietstock_retries,
        )

        if indicators_df.empty:
            raise ValueError("No rows scraped from 24hmoney")

        return indicators_df.to_dict(orient="records")

    @task(task_id="calculate_financial_ratios")
    def task_calculate_financial_ratios(vietstock_data: list[dict], money_data: list[dict], partition_folder: str) -> str:
        # 1. Reconstruct DataFrames from XCom input
        vietstock_df = pd.DataFrame(vietstock_data)
        money_df = pd.DataFrame(money_data)

        # 2. Merge them together on ticker
        raw_df = pd.merge(vietstock_df, money_df, on="ticker", how="left")

        # 3. Get DB details and calculate ratios
        db_url = Variable.get("dwh_db_url", default_var="postgresql+psycopg2://admin:123456@dwh-postgres:5432/postgres")
        schema = Variable.get("dwh_schema", default_var="hethong_phantich_chungkhoan")

        from logic.fin_ratio_v2 import calculate_financial_ratios
        print("Calculating financial ratios...")
        calculated_df = calculate_financial_ratios(raw_df, db_url=db_url, schema=schema)

        if calculated_df.empty:
            raise ValueError("No ratios calculated")

        # 4. Save final calculated ratios to MinIO (1 file per day under final key)
        final_key = f"fin_ratio_v2/{partition_folder}/fin_ratio_v2.csv"
        _save_to_minio(calculated_df, final_key)
        print(f"Saved final calculated ratios to MinIO: s3://{MINIO_BUCKET}/{final_key}")

        return f"OK | minio_key={final_key} | rows={len(calculated_df)}"

    partition_folder = get_partition_folder()
    vietstock_data = task_scrape_vietstock()
    money_data = task_scrape_24hmoney()
    task_calculate_financial_ratios(vietstock_data, money_data, partition_folder)


fin_ratio_v2_dag()
