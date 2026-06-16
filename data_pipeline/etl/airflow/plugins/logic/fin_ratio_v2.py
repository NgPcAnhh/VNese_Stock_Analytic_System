import re
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Iterable

import pandas as pd
import requests
from bs4 import BeautifulSoup


DEFAULT_TICKERS_PATH = Path(__file__).resolve().parent / "tickers_cache.txt"


def load_tickers(tickers: str | None = None, tickers_file: str | None = None, max_tickers: int = 0) -> list[str]:
    if tickers:
        symbols = [x.strip().upper() for x in tickers.split(",") if x.strip()]
    else:
        path = Path(tickers_file) if tickers_file else DEFAULT_TICKERS_PATH
        if not path.exists():
            raise FileNotFoundError(f"Ticker file not found: {path}")

        raw_lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        seen = set()
        symbols = []
        for line in raw_lines:
            symbol = line.strip().upper()
            if symbol and symbol not in seen:
                seen.add(symbol)
                symbols.append(symbol)

    if max_tickers > 0:
        symbols = symbols[:max_tickers]

    if not symbols:
        raise ValueError("Ticker list is empty")

    return symbols




def _to_float_safe(value: str | None) -> float | None:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        if pd.isna(value):
            return None
        return float(value)

    text = value.strip()
    if text == "" or text.upper() in {"NA", "N/A", "--", "-"}:
        return None

    text = text.replace(",", "")
    text = re.sub(r"[^0-9.\-]", "", text)
    if text in {"", ".", "-", "-."}:
        return None

    try:
        return float(text)
    except ValueError:
        return None


def _quarter_from_report_term(term_id: int | str | None) -> int | None:
    mapping = {2: 1, 3: 2, 4: 3, 5: 4}
    try:
        return mapping.get(int(term_id))
    except (TypeError, ValueError):
        return None


def _pick_norm_id(norm_rows: list[dict], needle: str) -> int | None:
    needle_up = needle.upper()
    for row in norm_rows:
        name = str(row.get("ReportNormName") or "").upper()
        if needle_up in name:
            norm_id = row.get("ReportNormId")
            try:
                return int(norm_id)
            except (TypeError, ValueError):
                return None
    return None


def _build_detail_payload(ticker: str, periods: list[dict], total_count: int, token: str) -> str:
    parts: list[tuple[str, str]] = [("StockCode", ticker), ("Unit", "1000000000"), ("TypeCompare", "1")]
    for i, item in enumerate(periods):
        parts.extend(
            [
                (f"listReportDataIds[{i}][Index]", str(i)),
                (f"listReportDataIds[{i}][ReportDataId]", str(item.get("ReportDataID"))),
                (f"listReportDataIds[{i}][IsShowData]", "true" if item.get("IsShowData_Permission") else "false"),
                (f"listReportDataIds[{i}][RowNumber]", str(item.get("RowNumber"))),
                (f"listReportDataIds[{i}][YearPeriod]", str(item.get("YearPeriod"))),
                (f"listReportDataIds[{i}][TotalCount]", str(total_count)),
                (f"listReportDataIds[{i}][SortTimeType]", "Time_ASC"),
            ]
        )
    parts.append(("__RequestVerificationToken", token))
    return urllib.parse.urlencode(parts)


def init_vietstock_session(ticker: str, timeout: int = 30) -> tuple[requests.Session, str]:
    session = requests.Session()
    page_url = f"https://finance.vietstock.vn/{ticker}/tai-chinh.htm?tab=BCTT"
    page = session.get(page_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=timeout)
    page.raise_for_status()

    soup = BeautifulSoup(page.text, "html.parser")
    token_tag = soup.select_one('input[name="__RequestVerificationToken"]')
    if token_tag is None or not token_tag.get("value"):
        session.close()
        raise RuntimeError("Cannot get Vietstock request token")

    return session, token_tag.get("value")


def get_eps_bvps_vietstock_api(ticker: str, wait_seconds: int = 5, retries: int = 2) -> pd.DataFrame | str:
    del wait_seconds  # kept for backward compatibility with test script signature
    ajax_headers = {"User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest"}

    last_error = None
    for attempt in range(1, retries + 1):
        session: requests.Session | None = None
        try:
            session, token = init_vietstock_session(ticker=ticker, timeout=30)

            periods_resp = session.post(
                "https://finance.vietstock.vn/data/BCTT_GetListReportData",
                data={
                    "StockCode": ticker,
                    "UnitedId": "-1",
                    "AuditedStatusId": "-1",
                    "Unit": "1000000000",
                    "IsNamDuongLich": "false",
                    "PeriodType": "QUY",
                    "SortTimeType": "Time_ASC",
                    "__RequestVerificationToken": token,
                },
                headers=ajax_headers,
                timeout=30,
            )
            periods_resp.raise_for_status()
            all_periods = periods_resp.json().get("data", [])
            if not all_periods:
                return "Cannot get report periods"

            selected_periods = all_periods[-1:]

            norm_resp = session.post(
                "https://finance.vietstock.vn/data/GetListReportNorm_BCTT_ByStockCode",
                data={"stockCode": ticker, "__RequestVerificationToken": token},
                headers=ajax_headers,
                timeout=30,
            )
            norm_resp.raise_for_status()
            norm_rows = norm_resp.json().get("data", [])

            eps_norm_id = _pick_norm_id(norm_rows, "(EPS)")
            bvps_norm_id = _pick_norm_id(norm_rows, "(BVPS)")
            if eps_norm_id is None and bvps_norm_id is None:
                return "Cannot find any required financial norm id"

            detail_payload = _build_detail_payload(
                ticker=ticker,
                periods=selected_periods,
                total_count=len(all_periods),
                token=token,
            )

            detail_resp = session.post(
                "https://finance.vietstock.vn/data/GetReportDataDetailValue_BCTT_ByReportDataIds",
                data=detail_payload,
                headers={**ajax_headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
                timeout=30,
            )
            detail_resp.raise_for_status()
            detail_rows = detail_resp.json().get("data", [])

            by_norm: dict[int, dict] = {}
            for row in detail_rows:
                try:
                    by_norm[int(row.get("ReportNormId"))] = row
                except (TypeError, ValueError):
                    continue

            eps_row = by_norm.get(eps_norm_id, {}) if eps_norm_id is not None else {}
            bvps_row = by_norm.get(bvps_norm_id, {}) if bvps_norm_id is not None else {}

            rows: list[dict] = []
            for idx, period in enumerate(selected_periods, start=1):
                quarter = _quarter_from_report_term(period.get("ReportTermID"))
                year = pd.to_numeric(period.get("YearPeriod"), errors="coerce")
                if pd.isna(year) or quarter is None:
                    continue

                eps_val = _to_float_safe(eps_row.get(f"Value{idx}")) if eps_row else None
                bvps_val = _to_float_safe(bvps_row.get(f"Value{idx}")) if bvps_row else None

                if eps_val is None and bvps_val is None:
                    continue

                rows.append(
                    {
                        "ticker": ticker,
                        "quarter": int(quarter),
                        "year": int(year),
                        "eps": eps_val,
                        "bvps": bvps_val,
                    }
                )

            if not rows:
                return "No valid EPS/BVPS data"

            return pd.DataFrame(rows)
        except Exception as exc:
            last_error = exc
            print(f"[VIETSTOCK RETRY] {ticker}: attempt {attempt}/{retries} failed - {exc}")
        finally:
            if session is not None:
                session.close()

    return f"Cannot fetch Vietstock data after {retries} retries: {last_error}"


def get_indicators_24hmoney(ticker: str, timeout: int = 15, retries: int = 2) -> dict[str, float | None] | str:
    url = f"https://24hmoney.vn/stock/{ticker.upper()}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, headers=headers, timeout=timeout)
            if resp.status_code != 200:
                raise RuntimeError(f"HTTP {resp.status_code}")

            soup = BeautifulSoup(resp.text, "html.parser")
            box = soup.find("div", class_="financial-indicators-box")
            if not box:
                return "Box financial-indicators-box not found"

            table = box.find("table", class_="financial-indicators-table")
            if not table:
                return "Table financial-indicators-table not found"

            divs = table.find_all("div")
            market_cap = None
            outstanding_shares = None
            for div in divs:
                spans = div.find_all("span")
                if len(spans) >= 2:
                    label_text = spans[0].get_text(strip=True)
                    price_text = spans[1].get_text(strip=True)
                    if "Vốn hóa (tỷ)" in label_text:
                        val_str = price_text
                        if "(" in val_str:
                            val_str = val_str.split("(")[0].strip()
                        val_str = val_str.replace(",", "")
                        val_str = re.sub(r"[^0-9.\-]", "", val_str)
                        if val_str:
                            market_cap = float(val_str)
                    elif "Slg lưu hành" in label_text:
                        val_str = price_text
                        val_str = val_str.replace(",", "")
                        val_str = re.sub(r"[^0-9.\-]", "", val_str)
                        if val_str:
                            outstanding_shares = float(val_str)

            if market_cap is None and outstanding_shares is None:
                return "Indicators 'Vốn hóa (tỷ)' and 'Slg lưu hành' not found in table"

            return {
                "market_cap": market_cap,
                "outstanding_shares": outstanding_shares
            }
        except Exception as exc:
            last_error = exc
            print(f"[24HMONEY RETRY] {ticker}: attempt {attempt}/{retries} failed - {exc}")
    return f"Cannot fetch 24hmoney data after {retries} retries: {last_error}"


def crawl_24hmoney_indicators(tickers: Iterable[str], workers: int = 8, timeout: int = 15, retries: int = 2) -> pd.DataFrame:
    all_rows: list[dict] = []
    errors: list[tuple[str, str]] = []

    def _run_one(symbol: str):
        return symbol, get_indicators_24hmoney(symbol, timeout=timeout, retries=retries)

    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = {executor.submit(_run_one, t): t for t in tickers}

        for future in as_completed(futures):
            symbol = futures[future]
            try:
                ticker, result = future.result()
                if isinstance(result, dict):
                    all_rows.append({
                        "ticker": ticker,
                        "market_cap": result.get("market_cap"),
                        "outstanding_shares": result.get("outstanding_shares")
                    })
                    print(f"[24HMONEY OK] {ticker}: market_cap={result.get('market_cap')}, outstanding_shares={result.get('outstanding_shares')}")
                else:
                    errors.append((ticker, str(result)))
                    print(f"[24HMONEY SKIP] {ticker}: {result}")
            except Exception as exc:
                errors.append((symbol, str(exc)))
                print(f"[24HMONEY ERR] {symbol}: {exc}")

    if errors:
        print(f"[24HMONEY] Total tickers failed/no-data: {len(errors)}")

    if not all_rows:
        return pd.DataFrame(columns=["ticker", "market_cap", "outstanding_shares"])

    return pd.DataFrame(all_rows)


def crawl_vietstock_eps_bvps(tickers: Iterable[str], workers: int = 8, wait_seconds: int = 5, retries: int = 2) -> pd.DataFrame:
    all_frames: list[pd.DataFrame] = []
    errors: list[tuple[str, str]] = []

    def _run_one(symbol: str):
        return symbol, get_eps_bvps_vietstock_api(symbol, wait_seconds=wait_seconds, retries=retries)

    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = {executor.submit(_run_one, t): t for t in tickers}

        for future in as_completed(futures):
            symbol = futures[future]
            try:
                ticker, result = future.result()
                if isinstance(result, pd.DataFrame) and not result.empty:
                    all_frames.append(result)
                    print(f"[VIETSTOCK OK] {ticker}: {len(result)} rows")
                else:
                    errors.append((ticker, str(result)))
                    print(f"[VIETSTOCK SKIP] {ticker}: {result}")
            except Exception as exc:
                errors.append((symbol, str(exc)))
                print(f"[VIETSTOCK ERR] {symbol}: {exc}")

    if errors:
        print(f"[VIETSTOCK] Total tickers failed/no-data: {len(errors)}")

    if not all_frames:
        return pd.DataFrame(columns=["ticker", "quarter", "year", "eps", "bvps"])

    out = pd.concat(all_frames, ignore_index=True)
    out = out.sort_values(by=["ticker", "year", "quarter"], ascending=[True, False, False]).reset_index(drop=True)
    return out


def run_pipeline_to_dataframe(
    tickers: list[str],
    vietstock_workers: int = 8,
    vietstock_wait_seconds: int = 5,
    vietstock_retries: int = 2,
    **kwargs,
) -> pd.DataFrame:
    print(f"[PIPELINE] Total tickers: {len(tickers)}")

    # Log/ignore any old smoney kwargs for backward compatibility if any callers still pass them
    if kwargs:
        print(f"[PIPELINE] Ignoring unused arguments: {list(kwargs.keys())}")

    print("[PIPELINE] Start flow: VIETSTOCK")
    vietstock_df = crawl_vietstock_eps_bvps(
        tickers=tickers,
        workers=vietstock_workers,
        wait_seconds=vietstock_wait_seconds,
        retries=vietstock_retries,
    )
    print(f"[PIPELINE] VIETSTOCK done: {len(vietstock_df)} rows")

    print("[PIPELINE] Start flow: 24HMONEY")
    indicators_df = crawl_24hmoney_indicators(
        tickers=tickers,
        workers=vietstock_workers,
        retries=vietstock_retries,
    )
    print(f"[PIPELINE] 24HMONEY done: {len(indicators_df)} rows")

    final_df = pd.merge(vietstock_df, indicators_df, on="ticker", how="left")
    return final_df


def safe_div(num, denom):
    if num is None or denom is None or denom == 0:
        return None
    try:
        import pandas as pd
        import numpy as np
        res = num / denom
        if pd.isna(res) or np.isinf(res):
            return None
        return float(res)
    except Exception:
        return None


def safe_sub(a, b):
    if a is None or b is None:
        return None
    return float(a - b)


def safe_add(a, b):
    if a is None or b is None:
        return None
    return float(a + b)


def safe_mul(a, b):
    if a is None or b is None:
        return None
    return float(a * b)


def calculate_financial_ratios(df: pd.DataFrame, db_url: str, schema: str = "hethong_phantich_chungkhoan") -> pd.DataFrame:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    import numpy as np
    import pandas as pd

    # Filter to keep only the latest quarter for each ticker
    df = df.copy()
    df = df.dropna(subset=["year", "quarter"])
    df["year"] = pd.to_numeric(df["year"], errors="coerce").astype(int)
    df["quarter"] = pd.to_numeric(df["quarter"], errors="coerce").astype(int)
    
    # Ghép year và quarter thành year/quarter
    df["year/quarter"] = df["year"].astype(str) + "/" + df["quarter"].astype(str)
    
    # Sắp xếp và chỉ giữ lại bản ghi có year/quarter lớn nhất (xét year trước và quarter sau) cho mỗi ticker
    df = df.sort_values(by=["ticker", "year", "quarter"], ascending=[True, False, False])
    df = df.drop_duplicates(subset=["ticker"], keep="first")

    # 1. Query latest close prices
    price_map = {}
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"""
                SELECT DISTINCT ON (ticker) ticker, close
                FROM {schema}.history_price
                ORDER BY ticker, trading_date DESC
            """)
            for r in cur.fetchall():
                price_map[str(r['ticker']).upper()] = float(r['close']) if r['close'] is not None else None
    except Exception as exc:
        print(f"⚠️ Error fetching close prices: {exc}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

    # 2. Extract keys for BCTC query
    keys = []
    for _, row in df.iterrows():
        ticker = str(row['ticker']).strip().upper()
        year = int(row['year']) if pd.notna(row['year']) else None
        quarter = int(row['quarter']) if pd.notna(row['quarter']) else None
        if ticker and year is not None and quarter is not None:
            keys.append((ticker, year, quarter))

    bctc_map = {}
    if keys:
        try:
            conn = psycopg2.connect(db_url)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                placeholders = ", ".join(["(%s, %s, %s)"] * len(keys))
                query = f"""
                    SELECT ticker, year, quarter, ind_code, value
                    FROM {schema}.bctc
                    WHERE (ticker, year, quarter) IN ({placeholders})
                """
                params = []
                for k in keys:
                    params.extend([k[0], k[1], str(k[2])])

                cur.execute(query, params)
                for r in cur.fetchall():
                    t = str(r['ticker']).upper()
                    y = int(r['year'])
                    
                    try:
                        q = int(r['quarter'])
                    except (ValueError, TypeError):
                        continue
                        
                    ind_code = str(r['ind_code']).strip()
                    val = float(r['value']) if r['value'] is not None else None

                    key = (t, y, q)
                    if key not in bctc_map:
                        bctc_map[key] = {}
                    bctc_map[key][ind_code] = val
        except Exception as exc:
            print(f"⚠️ Error fetching BCTC values: {exc}")
        finally:
            if 'conn' in locals() and conn:
                conn.close()

    # 3. Calculate indicators for each row
    calculated_rows = []
    for _, row in df.iterrows():
        ticker = str(row['ticker']).strip().upper()
        year = int(row['year']) if pd.notna(row['year']) else None
        quarter = int(row['quarter']) if pd.notna(row['quarter']) else None

        eps_val = row.get('eps')
        bvps_val = row.get('bvps')
        market_cap_scraped = row.get('market_cap')
        outstanding_shares_val = row.get('outstanding_shares')

        vals = bctc_map.get((ticker, year, quarter), {})

        def get_val(code_or_codes, default=None):
            if isinstance(code_or_codes, str):
                codes = [code_or_codes]
            else:
                codes = code_or_codes
            for code in codes:
                if code in vals and vals[code] is not None:
                    return float(vals[code])
            return default

        # Income Statement Group
        doanh_thu = get_val(["IS_NET_REVENUE", "IS_REVENUE", "IS_OP_REV_TOTAL"])
        gia_von = get_val("IS_COGS")

        gross_profit_val = get_val("IS_GROSS_PROFIT")
        if gross_profit_val is not None:
            ln_gop = gross_profit_val
        elif doanh_thu is not None and gia_von is not None:
            ln_gop = doanh_thu - gia_von
        else:
            ln_gop = None

        lntt = get_val(["IS_PBT", "IS_NET_PBT"])
        lnst = get_val(["IS_NPAT_PARENT", "IS_NPAT_OWNER", "IS_NPAT", "IS_NET_PROFIT"])
        chi_phi_lai_vay = get_val("IS_INT_EXP")
        chi_phi_thue = get_val(["IS_TAX_EXP", "IS_TAX_CURRENT"])
        khau_hao = get_val("IS_DEPR_EXP")

        # Balance Sheet Group
        tong_ts = get_val("BS_TOT_ASSET")
        ts_nh = get_val(["BS_CUR_ASSETS", "BS_CUR_ASSETS_ST_INV"])
        ts_cd = get_val(["BS_FA", "BS_TANGIBLE_FA"])
        vcsh = get_val(["BS_EQUITY", "BS_OWNER_CAPITAL"])
        von_dieu_le = get_val("BS_CHARTER_CAPITAL")
        hang_ton_kho = get_val(["BS_NET_INVENTORY", "BS_INVENTORY"])
        tien_va_tdt = get_val(["BS_CASH_EQ", "BS_CASH", "CF_CASH_END"])
        phai_thu_kh = get_val(["BS_ST_REC_CUST", "BS_REC_CUST", "BS_ST_REC", "BS_REC"])
        phai_tra_nb = get_val(["BS_ST_PAY_SUPPLIER", "BS_PAY_SUPPLIER"])
        tong_no_phai_tra = get_val("BS_LIABILITIES")
        no_ngan_han = get_val("BS_ST_LIABILITIES")

        no_vay_nh = get_val("BS_ST_DEBT")
        if no_vay_nh is None:
            st_borrow = get_val("BS_ST_BORROWINGS", 0.0)
            st_lease = get_val("BS_ST_FIN_LEASE_DEBT", 0.0)
            no_vay_nh = st_borrow + st_lease

        no_vay_dh = get_val("BS_LT_DEBT")
        if no_vay_dh is None:
            lt_borrow = get_val("BS_LT_BORROWINGS", 0.0)
            lt_lease = get_val("BS_LT_FIN_LEASE_DEBT", 0.0)
            no_vay_dh = lt_borrow + lt_lease

        tong_no_vay = no_vay_nh + no_vay_dh

        # Cash Flow Group
        dong_tien_hdkd = get_val("CF_CFO")
        co_tuc_da_tra = get_val("CF_CFF_DIV_PAID")

        price_val = price_map.get(ticker)

        # Market Cap in VND (scraped value is in billions)
        market_cap_vnd = None
        if market_cap_scraped is not None:
            market_cap_vnd = market_cap_scraped * 1e9

        # --- CALCULATIONS ---
        # 1. Capital Structure & Liquidity
        fixed_asset_to_equity = safe_div(ts_cd, vcsh)
        equity_to_charter_capital = safe_div(vcsh, von_dieu_le)
        financial_leverage = safe_div(tong_ts, vcsh)
        long_short_term_debt_on_equity = safe_div(tong_no_vay, vcsh)
        debt_to_equity = safe_div(tong_no_phai_tra, vcsh)
        current_ratio = safe_div(ts_nh, no_ngan_han)
        quick_ratio = safe_div(safe_sub(ts_nh, hang_ton_kho), no_ngan_han)
        cash_ratio = safe_div(tien_va_tdt, no_ngan_han)

        # 2. Operating Efficiency
        asset_turnover = safe_div(doanh_thu, tong_ts)
        fixed_asset_turnover = safe_div(doanh_thu, ts_cd)
        inventory_turnover = safe_div(gia_von, hang_ton_kho)
        receivable_days = safe_mul(safe_div(phai_thu_kh, doanh_thu), 365.0)
        inventory_days = safe_mul(safe_div(hang_ton_kho, gia_von), 365.0)
        payable_days = safe_mul(safe_div(phai_tra_nb, gia_von), 365.0)
        cash_conversion_cycle = safe_sub(safe_add(receivable_days, inventory_days), payable_days)

        # 3. Margins & Profitability
        ebit_value = safe_add(lntt, chi_phi_lai_vay)
        ebitda_value = safe_add(ebit_value, khau_hao)
        ebit_margin = safe_div(ebit_value, doanh_thu)
        gross_margin = safe_div(ln_gop, doanh_thu)
        net_margin = safe_div(lnst, doanh_thu)
        roe = safe_div(lnst, vcsh)
        roa = safe_div(lnst, tong_ts)

        tax_rate = safe_div(chi_phi_thue, lntt)
        one_minus_tax = safe_sub(1.0, tax_rate) if tax_rate is not None else 1.0
        roic_numerator = safe_mul(ebit_value, one_minus_tax)
        roic_denom = safe_sub(safe_add(vcsh, tong_no_vay), tien_va_tdt)
        roic = safe_div(roic_numerator, roic_denom)

        interest_coverage_ratio = safe_div(ebit_value, chi_phi_lai_vay)

        price_vnd = None
        if price_val is not None:
            price_vnd = price_val * 1000.0

        # 5. Valuation
        pe = safe_div(price_vnd, eps_val)
        pb = safe_div(price_vnd, bvps_val)
        ps = safe_div(market_cap_vnd, doanh_thu)
        p_cashflow = safe_div(market_cap_vnd, dong_tien_hdkd)

        ev_ebitda_numerator = safe_sub(safe_add(market_cap_vnd, tong_no_vay), tien_va_tdt)
        ev_ebitda = safe_div(ev_ebitda_numerator, ebitda_value)

        dividend_yield = None

        calculated_rows.append({
            "ticker": ticker,
            "year": year,
            "quarter": quarter,
            "year/quarter": f"{year}/{quarter}" if (year is not None and quarter is not None) else None,
            "fixed_asset_to_equity": fixed_asset_to_equity,
            "equity_to_charter_capital": equity_to_charter_capital,
            "financial_leverage": financial_leverage,
            "long_short_term_debt_on_equity": long_short_term_debt_on_equity,
            "debt_to_equity": debt_to_equity,
            "current_ratio": current_ratio,
            "quick_ratio": quick_ratio,
            "cash_ratio": cash_ratio,
            "asset_turnover": asset_turnover,
            "fixed_asset_turnover": fixed_asset_turnover,
            "inventory_turnover": inventory_turnover,
            "receivable_days": receivable_days,
            "inventory_days": inventory_days,
            "payable_days": payable_days,
            "cash_conversion_cycle": cash_conversion_cycle,
            "ebit_value": ebit_value,
            "ebitda_value": ebitda_value,
            "ebit_margin": ebit_margin,
            "gross_margin": gross_margin,
            "net_margin": net_margin,
            "roe": roe,
            "roa": roa,
            "roic": roic,
            "interest_coverage_ratio": interest_coverage_ratio,
            "pe": pe,
            "pb": pb,
            "ps": ps,
            "p_cashflow": p_cashflow,
            "ev_ebitda": ev_ebitda,
            "dividend_yield": dividend_yield,
            "eps": eps_val,
            "bvps": bvps_val,
            "market_cap": market_cap_scraped,
            "outstanding_shares": outstanding_shares_val,
            "period_type": "quarter",
            "extracted_at": pd.Timestamp.utcnow().isoformat()
        })

    return pd.DataFrame(calculated_rows)


