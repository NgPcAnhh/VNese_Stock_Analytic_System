import time
from datetime import datetime, timedelta
import pandas as pd
from vnstock import Trading, Listing, Quote
from concurrent.futures import ThreadPoolExecutor, as_completed

# Vietnam timezone / rate limits helper
def _retry_price_board(symbols: list, retries: int = 3, base_delay: float = 3.0) -> pd.DataFrame:
    """Call vnstock Trading.price_board with retry logic for rate limit and errors."""
    for attempt in range(retries):
        try:
            trading = Trading(symbol='VN30F1M')
            df = trading.price_board(symbols_list=symbols)
            if df is not None and isinstance(df, pd.DataFrame) and not df.empty:
                return df
            time.sleep(base_delay)
        except Exception as exc:
            msg = str(exc)
            if "429" in msg or "Too Many Requests" in msg:
                wait = base_delay * (attempt + 1)
                print(f"[DAILY_PRICE] 429 Too Many Requests, retry {attempt + 1}/{retries} in {wait:.1f}s")
                time.sleep(wait)
                continue
            print(f"[DAILY_PRICE] Error: {exc}")
            time.sleep(base_delay)
    return pd.DataFrame()


def _fetch_symbol_history_price(symbol: str, target_date: str) -> pd.DataFrame:
    """Fetch history price for a single symbol on a specific date with retries."""
    sources = ["kbs", "vci"]
    for source in sources:
        for attempt in range(3):
            try:
                quote = Quote(symbol=symbol, source=source.lower())
                df = quote.history(start=target_date, end=target_date)
                if df is not None and isinstance(df, pd.DataFrame) and not df.empty:
                    df = df.copy()
                    rename_map = {"time": "date", "Time": "date"}
                    df.rename(columns=rename_map, inplace=True)
                    
                    if "date" in df.columns:
                        df["trading_date"] = pd.to_datetime(df["date"], errors="coerce").dt.date.astype(str)
                    elif "trading_date" not in df.columns:
                        continue
                        
                    for col in ["open", "high", "low", "close", "volume"]:
                        if col not in df.columns:
                            df[col] = pd.NA
                            
                    df["ticker"] = symbol
                    cols = ["ticker", "trading_date", "open", "high", "low", "close", "volume"]
                    return df[cols].dropna(subset=["trading_date"])
                
                time.sleep(1.0)
            except Exception as exc:
                msg = str(exc).lower()
                if "429" in msg or "too many requests" in msg:
                    time.sleep(3.0)
                else:
                    break
    return pd.DataFrame()


def get_daily_price(
    target_date: str | None = None,
    **kwargs  # Bỏ qua các params không dùng để tương thích với DAG cũ
) -> pd.DataFrame:
    """
    Fetch EOD daily prices for all common stock symbols (len == 3).
    If target_date is today, uses the fast Trading.price_board API.
    If target_date is in the past, uses Quote.history with ThreadPoolExecutor.
    """
    vn_today = (datetime.utcnow() + timedelta(hours=7)).strftime("%Y-%m-%d")
    date_str = target_date or vn_today
    
    print(f"[daily_price] Fetching list of all symbols...")
    listing = Listing()
    df_sym = listing.symbols_by_exchange()
    
    # Filter only common stocks (length of symbol is exactly 3)
    all_tickers = [
        s for s in df_sym['symbol'].dropna().unique().tolist()
        if len(s) == 3
    ]
    
    print(f"[daily_price] Total common stock tickers to fetch: {len(all_tickers)}")
    
    if date_str == vn_today:
        print(f"[daily_price] Target date ({date_str}) is today. Using fast price_board logic.")
        # Split into batches of 300 to avoid any API payload or URL size limitations
        batch_size = 300
        batches = [all_tickers[i:i + batch_size] for i in range(0, len(all_tickers), batch_size)]
        
        frames = []
        for idx, batch in enumerate(batches, 1):
            print(f"[daily_price] Fetching batch {idx}/{len(batches)} (size={len(batch)})...")
            raw_df = _retry_price_board(batch)
            if not raw_df.empty:
                frames.append(raw_df)
            time.sleep(1.0)  # small safety delay
            
        if not frames:
            raise RuntimeError(f"No price data collected on {date_str}; market likely closed or API unavailable.")
            
        df = pd.concat(frames, ignore_index=True)
        
        # Clean and rename columns to match historical price DB schema
        column_rename = {
            'symbol': 'ticker',
            'open_price': 'open',
            'high_price': 'high',
            'low_price': 'low',
            'close_price': 'close',
            'volume_accumulated': 'volume'
        }
        df = df.rename(columns=column_rename)
        
        # Scale price columns by dividing by 1000.0 (since history_price table stores prices in thousands)
        price_cols = ['open', 'high', 'low', 'close']
        for col in price_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce') / 1000.0
                
        df['trading_date'] = date_str
        required_cols = ['ticker', 'trading_date', 'open', 'high', 'low', 'close', 'volume']
        available_cols = [c for c in required_cols if c in df.columns]
        df = df[available_cols].dropna(subset=['ticker', 'trading_date'])
        
        print(f"[daily_price] Successfully collected {len(df)} records for {date_str}")
        return df
    else:
        print(f"[daily_price] Target date ({date_str}) is in the past. Using parallel Quote.history.")
        frames = []
        max_workers = 10
        
        def fetch_task(symbol):
            return _fetch_symbol_history_price(symbol, date_str)
            
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_symbol = {executor.submit(fetch_task, sym): sym for sym in all_tickers}
            
            completed_count = 0
            for future in as_completed(future_to_symbol):
                completed_count += 1
                sym = future_to_symbol[future]
                try:
                    res_df = future.result()
                    if res_df is not None and not res_df.empty:
                        frames.append(res_df)
                        if len(frames) % 100 == 0:
                            print(f"[daily_price] Fetched {len(frames)} symbols successfully.")
                except Exception as e:
                    print(f"[daily_price] Error fetching {sym} for {date_str}: {e}")
                    
        if not frames:
            raise RuntimeError(f"No price data collected on historical date {date_str}. Make sure it is a business day.")
            
        df = pd.concat(frames, ignore_index=True)
        print(f"[daily_price] Successfully collected {len(df)} records for historical date {date_str}")
        return df

