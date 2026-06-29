from __future__ import annotations

import concurrent.futures
import contextlib
import json
import random
import re
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests
from airflow.decorators import dag, task
from airflow.models import Variable
from airflow.models.param import Param
from bs4 import BeautifulSoup
from psycopg2.extras import execute_values

from lake_to_dwh.utils import get_postgres_connection, ensure_schema

TICKERS_FILE = Path(__file__).resolve().parents[1] / "plugins" / "logic" / "tickers_cache.txt"
MAPPING_FILE = Path(__file__).resolve().parents[1] / "plugins" / "logic" / "bctc.md"

def _norm_text(text: object) -> str:
    s = "" if text is None else str(text).strip().lower()
    return re.sub(r"\s+", " ", s)

def _load_mapping() -> tuple[dict[str, str], dict[str, str]]:
    if not MAPPING_FILE.exists():
        raise FileNotFoundError(f"Mapping file not found: {MAPPING_FILE}")

    raw = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))
    exact: dict[str, str] = {}
    norm: dict[str, str] = {}
    for item in raw:
        name = str(item.get("ind_name", "")).strip()
        code = str(item.get("ind_code", "")).strip()
        if not name or not code:
            continue
        exact[name] = code
        norm[_norm_text(name)] = code
    return exact, norm

def _map_ind_code(ind_name: str, ind_map_exact: dict[str, str], ind_map_norm: dict[str, str]) -> str:
    if ind_name in ind_map_exact:
        return ind_map_exact[ind_name]
    code = ind_map_norm.get(_norm_text(ind_name))
    if code:
        return code
    # Fallback slugify
    slug = re.sub(r"[^A-Za-z0-9]+", "_", ind_name).strip("_")
    return slug.lower() or "unknown"

# Shared Thread Local session
_thread_local = threading.local()

def read_tickers(tickers_file: Path, max_tickers: int = 0) -> list[str]:
    if not tickers_file.exists():
        raise FileNotFoundError(f"Ticker file not found: {tickers_file}")

    raw = tickers_file.read_text(encoding="utf-8", errors="ignore").splitlines()
    cleaned = [line.strip().upper() for line in raw if line.strip()]

    seen: set[str] = set()
    unique: list[str] = []
    for ticker in cleaned:
        if ticker not in seen:
            seen.add(ticker)
            unique.append(ticker)

    if max_tickers and max_tickers > 0:
        unique = unique[:max_tickers]

    return unique

def chunked(items: list[str], size: int) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]

def build_http_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            )
        }
    )
    return session

def get_thread_session() -> requests.Session:
    session = getattr(_thread_local, "session", None)
    if session is None:
        session = build_http_session()
        _thread_local.session = session
    return session

def clean_value(val_str: str) -> float | None:
    if not val_str:
        return None
    val_str = val_str.strip().replace(",", "")
    if not val_str or val_str in {"-", "--", "null", "none", "nan", "n/a", "na"}:
        return None
    
    # Handle negative numbers wrapped in parenthesis, e.g. (12,345)
    negative = False
    if val_str.startswith("(") and val_str.endswith(")"):
        negative = True
        val_str = val_str[1:-1].strip()
        
    try:
        num = float(val_str)
        val = num * 1000000
        return -val if negative else val
    except ValueError:
        return None


def fetch_and_parse_ticker(
    ticker: str,
    period_type: str,
    request_sleep: float,
    connect_timeout: int,
    read_timeout: int,
    max_retries: int,
    retry_backoff: float,
) -> list[dict]:
    session = get_thread_session()
    url = f"https://www.cophieu68.vn/quote/financial_detail.php?id={ticker}&type={period_type}"
    timeout_tuple = (connect_timeout, read_timeout)
    
    html = ""
    for attempt in range(max_retries + 1):
        try:
            resp = session.get(url, timeout=timeout_tuple)
            resp.raise_for_status()
            resp.encoding = 'utf-8'
            html = resp.text
            break
        except Exception as e:
            if attempt >= max_retries:
                print(f"[dl_bctc_3] Error fetching {ticker} after {max_retries} retries: {e}")
                return []
            sleep_s = retry_backoff * (2 ** attempt) + random.uniform(0.0, 0.35)
            time.sleep(sleep_s)
            
    if not html:
        return []
        
    try:
        soup = BeautifulSoup(html, "html.parser")
        
        tables_config = [
            ("table_content_income", "income_statement", "IS"),
            ("table_content_balance", "balance_sheet", "BL")
        ]
        
        records = []
        
        for table_id, report_name, report_code in tables_config:
            table = soup.find("table", id=table_id)
            if not table:
                continue
                
            # A. Header Parsing
            tr_header = table.find("tr", class_="tr_header")
            if not tr_header:
                continue
                
            time_tds = tr_header.find_all("td", align="right")
            time_periods = []
            
            for td in time_tds:
                text_content = ""
                for child in td.children:
                    if child.name == 'br':
                        text_content += '\n'
                    elif isinstance(child, str):
                        text_content += child
                    else:
                        text_content += child.get_text()
                
                lines = [l.strip() for l in text_content.split('\n') if l.strip()]
                
                if period_type == "quarter":
                    if len(lines) >= 2:
                        q_str = lines[0]
                        y_str = lines[1]
                    elif len(lines) == 1:
                        m = re.search(r"Q\w*s?\s*([1-4])", lines[0], re.IGNORECASE)
                        q_str = m.group(1) if m else "1"
                        m_year = re.search(r"(\d{4})", lines[0])
                        y_str = m_year.group(1) if m_year else "2025"
                    else:
                        q_str = "1"
                        y_str = "2025"
                    
                    m_q = re.search(r"(\d+)", q_str)
                    q_val = m_q.group(1) if m_q else "1"
                    
                    year_digits = re.sub(r"\D", "", y_str)
                    year_val = int(year_digits) if year_digits else 2025
                    time_periods.append((q_val, year_val))
                else:
                    if lines:
                        y_str = lines[0]
                    else:
                        y_str = td.get_text()
                    year_digits = re.sub(r"\D", "", y_str)
                    year_val = int(year_digits) if year_digits else 2025
                    time_periods.append(("0", year_val))
            
            # B. Body Parsing
            tbody = table.find("tbody") or table
            rows = tbody.find_all("tr")
            
            for row in rows:
                if "tr_header" in row.get("class", []):
                    continue
                    
                tds = row.find_all("td")
                if not tds:
                    continue
                    
                metric_td = None
                for td in tds:
                    classes = td.get("class", [])
                    if "td_bg2" in classes and "td_bottom3" in classes:
                        metric_td = td
                        break
                        
                if not metric_td:
                    continue
                    
                ind_name = metric_td.get_text(strip=True)
                if not ind_name:
                    continue
                    
                value_tds = row.find_all("td", class_="td_bottom3", align="right")
                
                limit = min(len(time_periods), len(value_tds))
                for idx in range(limit):
                    q_val, y_val = time_periods[idx]
                    val_text = value_tds[idx].get_text(strip=True)
                    val_num = clean_value(val_text)
                    
                    records.append({
                        "ticker": ticker.upper(),
                        "quarter": q_val,
                        "year": y_val,
                        "ind_name": ind_name,
                        "ind_code": None,
                        "value": val_num,
                        "report_name": report_name,
                        "report_code": report_code
                    })
                    
        return records
    except Exception as e:
        print(f"[dl_bctc_3] Error parsing {ticker}: {e}")
        return []
    finally:
        if request_sleep > 0:
            time.sleep(request_sleep)

def sync_records_to_db(df: pd.DataFrame, db_url: str, schema: str) -> int:
    if df.empty:
        return 0
    
    table_name = "bctc"
    rows = []
    for _, row in df.iterrows():
        val = row['value']
        if pd.isna(val):
            val = None
        rows.append((
            row['ticker'],
            row['quarter'],
            row['year'],
            row['ind_name'],
            row['ind_code'],
            val,
            row['report_name'],
            row['report_code']
        ))
    create_table_sql = f"""
    CREATE TABLE IF NOT EXISTS {schema}.{table_name} (
        ticker VARCHAR(10) NOT NULL,
        quarter VARCHAR(10) NOT NULL,
        year INTEGER NOT NULL,
        ind_name TEXT NOT NULL,
        ind_code VARCHAR(50) NOT NULL,
        value NUMERIC(25, 4),
        import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        report_name VARCHAR(255),
        report_code VARCHAR(50),
        PRIMARY KEY (ticker, year, quarter, ind_code, ind_name)
    );
    CREATE INDEX IF NOT EXISTS idx_bctc_temp_ticker ON {schema}.{table_name} (ticker);
    CREATE INDEX IF NOT EXISTS idx_bctc_temp_year_quarter ON {schema}.{table_name} (year, quarter);
    """
    
    upsert_sql = f"""
    INSERT INTO {schema}.{table_name}
    (ticker, quarter, year, ind_name, ind_code, value, report_name, report_code)
    VALUES %s
    ON CONFLICT (ticker, year, quarter, ind_code, ind_name)
    DO UPDATE SET
        value = CASE 
            WHEN EXCLUDED.value IS NOT NULL AND EXCLUDED.value <> 0 THEN EXCLUDED.value 
            ELSE {schema}.{table_name}.value 
        END,
        report_name = EXCLUDED.report_name,
        report_code = EXCLUDED.report_code,
        import_time = CURRENT_TIMESTAMP;
    """
    
    with contextlib.closing(get_postgres_connection(db_url)) as conn:
        with conn.cursor() as cur:
            ensure_schema(conn, schema)
            cur.execute(create_table_sql)
            execute_values(cur, upsert_sql, rows, page_size=1000)
        conn.commit()
        
    return len(rows)


# DAG definition
@dag(
    dag_id="dl_bctc_3",
    start_date=datetime(2026, 1, 1),
    schedule="@monthly",
    catchup=False,
    max_active_runs=1,
    default_args={
        "owner": "airflow",
        "retries": 2,
        "retry_delay": timedelta(minutes=3),
    },
    params={
        "batch_size": Param(
            default=20,
            type="integer",
            minimum=1,
            maximum=100,
            description="Number of tickers in each scraping batch",
        ),
        "workers": Param(
            default=8,
            type="integer",
            minimum=1,
            maximum=64,
            description="Max worker threads for scraping each batch",
        ),
        "request_sleep": Param(
            default=0.2,
            type="number",
            minimum=0,
            maximum=10,
            description="Sleep seconds after each ticker request",
        ),
        "connect_timeout": Param(
            default=20,
            type="integer",
            minimum=1,
            maximum=120,
            description="HTTP connect timeout (seconds)",
        ),
        "read_timeout": Param(
            default=45,
            type="integer",
            minimum=1,
            maximum=300,
            description="HTTP read timeout (seconds)",
        ),
        "http_retries": Param(
            default=3,
            type="integer",
            minimum=0,
            maximum=10,
            description="HTTP retries per request",
        ),
        "retry_backoff": Param(
            default=1.0,
            type="number",
            minimum=0,
            maximum=20,
            description="Exponential backoff base seconds",
        ),
        "max_tickers": Param(
            default=0,
            type="integer",
            minimum=0,
            maximum=10000,
            description="Limit number of tickers for test run (0 = all)",
        ),
    },
    tags=["vnstock", "bctc", "cophieu68", "postgres"],
    description="Crawl BCTC from cophieu68.vn -> Transform (unpivot) -> Sync to Postgres bctc_temp",
)
def dl_bctc_3_dag():
    def _run_scrape_and_sync(period_type: str, **context) -> str:
        params = context["params"]
        batch_size = int(params.get("batch_size", 20))
        workers = int(params.get("workers", 8))
        request_sleep = float(params.get("request_sleep", 0.2))
        connect_timeout = int(params.get("connect_timeout", 20))
        read_timeout = int(params.get("read_timeout", 45))
        http_retries = int(params.get("http_retries", 3))
        retry_backoff = float(params.get("retry_backoff", 1.0))
        max_tickers = int(params.get("max_tickers", 0))

        db_url = Variable.get("dwh_db_url", default_var="postgresql+psycopg2://admin:123456@dwh-postgres:5432/postgres")
        schema = Variable.get("dwh_schema", default_var="hethong_phantich_chungkhoan")

        print("=" * 80)
        print(f"DL_BCTC_3 START: period_type={period_type}")
        print(f"batch_size={batch_size}, workers={workers}, max_tickers={max_tickers}")
        print("=" * 80)

        tickers = read_tickers(TICKERS_FILE, max_tickers=max_tickers)
        if not tickers:
            return f"No tickers found to scrape for {period_type}"

        batches = chunked(tickers, batch_size)
        print(f"Total tickers: {len(tickers):,} | Total batches: {len(batches):,}")

        scraped_records: list[dict] = []
        
        for idx, batch in enumerate(batches, start=1):
            max_workers = max(1, min(workers, len(batch)))
            print(f"[Batch {idx}/{len(batches)}] tickers={len(batch)} | workers={max_workers}")

            if max_workers == 1:
                for ticker in batch:
                    records = fetch_and_parse_ticker(
                        ticker=ticker,
                        period_type=period_type,
                        request_sleep=request_sleep,
                        connect_timeout=connect_timeout,
                        read_timeout=read_timeout,
                        max_retries=http_retries,
                        retry_backoff=retry_backoff,
                    )
                    scraped_records.extend(records)
            else:
                with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                    futures = {
                        executor.submit(
                            fetch_and_parse_ticker,
                            ticker=ticker,
                            period_type=period_type,
                            request_sleep=request_sleep,
                            connect_timeout=connect_timeout,
                            read_timeout=read_timeout,
                            max_retries=http_retries,
                            retry_backoff=retry_backoff,
                        ): ticker
                        for ticker in batch
                    }
                    for future in concurrent.futures.as_completed(futures):
                        try:
                            records = future.result()
                            scraped_records.extend(records)
                        except Exception as e:
                            ticker = futures[future]
                            print(f"[dl_bctc_3] Thread execution error for ticker {ticker}: {e}")

        print(f"Total scraped records: {len(scraped_records):,}")
        if not scraped_records:
            return f"No records parsed for {period_type}"

        df = pd.DataFrame(scraped_records)
        
        # Clean dataframe types
        df["ticker"] = df["ticker"].astype(str).str.strip().str.upper()
        df["quarter"] = df["quarter"].astype(str).str.strip()
        df["year"] = pd.to_numeric(df["year"], errors="coerce").astype("Int64")
        df["ind_name"] = df["ind_name"].astype(str).str.strip()
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df["report_name"] = df["report_name"].astype(str).str.strip()
        df["report_code"] = df["report_code"].astype(str).str.strip()

        # Map ind_code in memory using bctc.md mapping
        try:
            ind_map_exact, ind_map_norm = _load_mapping()
            df["ind_code"] = df["ind_name"].apply(
                lambda x: _map_ind_code(x, ind_map_exact, ind_map_norm)
            )
        except Exception as e:
            print(f"[dl_bctc_3] Warning: failed to map ind_code in memory: {e}")
            df["ind_code"] = "unknown"

        # Drop rows missing PK fields
        df = df.dropna(subset=["ticker", "year", "quarter", "ind_name", "ind_code"])

        # Deduplicate to keep latest entry in input order
        df = df.drop_duplicates(subset=["ticker", "year", "quarter", "ind_code", "ind_name"], keep="last")
        print(f"Deduplicated to {len(df):,} unique PK records")

        if df.empty:
            return f"No records after cleaning for {period_type}"

        # Sync database
        rows_synced = sync_records_to_db(df, db_url=db_url, schema=schema)
        print(f"Successfully synced {rows_synced:,} records to database table {schema}.bctc")
        print("=" * 80)

        return f"OK | synced_rows={rows_synced}"

    @task(task_id="scrape_quarter")
    def scrape_quarter(**context) -> str:
        return _run_scrape_and_sync("quarter", **context)

    @task(task_id="scrape_year")
    def scrape_year(**context) -> str:
        return _run_scrape_and_sync("year", **context)

    @task(task_id="map_ind_code")
    def map_ind_code_task() -> str:
        try:
            ind_map_exact, ind_map_norm = _load_mapping()
        except Exception as e:
            return f"Error loading mapping: {e}"

        db_url = Variable.get("dwh_db_url", default_var="postgresql+psycopg2://admin:123456@dwh-postgres:5432/postgres")
        schema = Variable.get("dwh_schema", default_var="hethong_phantich_chungkhoan")
        table_name = "bctc"

        with contextlib.closing(get_postgres_connection(db_url)) as conn:
            with conn.cursor() as cur:
                # Fetch all unique ind_name with null or empty ind_code
                cur.execute(f"""
                    SELECT DISTINCT ind_name 
                    FROM {schema}.{table_name} 
                    WHERE ind_code IS NULL OR ind_code = '';
                """)
                rows = cur.fetchall()
                if not rows:
                    return "No unmapped ind_name found"
                
                updated_count = 0
                for (ind_name,) in rows:
                    mapped_code = _map_ind_code(ind_name, ind_map_exact, ind_map_norm)
                    if mapped_code:
                        cur.execute(f"""
                            UPDATE {schema}.{table_name}
                            SET ind_code = %s
                            WHERE ind_name = %s AND (ind_code IS NULL OR ind_code = '');
                        """, (mapped_code, ind_name))
                        updated_count += cur.rowcount
            conn.commit()

        return f"Successfully mapped {updated_count} rows in database"

    sq = scrape_quarter()
    sy = scrape_year()
    mc = map_ind_code_task()

    sq >> mc
    sy >> mc

dl_bctc_3_dag()
