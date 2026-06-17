import time
from datetime import datetime
import pandas as pd
from vnstock import Trading, Listing

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

def get_daily_price(
    target_date: str | None = None,
    **kwargs  # Bỏ qua các params không dùng để tương thích với DAG cũ
) -> pd.DataFrame:
    """
    Fetch EOD daily prices for all common stock symbols (len == 3) using Trading.price_board API.
    Highly optimized to avoid symbol-by-symbol rate limiting.
    """
    date_str = pd.to_datetime(target_date or datetime.utcnow().date()).strftime("%Y-%m-%d")
    
    print(f"[daily_price] Fetching list of all symbols...")
    listing = Listing()
    df_sym = listing.symbols_by_exchange()
    
    # Filter only common stocks (length of symbol is exactly 3)
    all_tickers = [
        s for s in df_sym['symbol'].dropna().unique().tolist()
        if len(s) == 3
    ]
    
    print(f"[daily_price] Total common stock tickers to fetch: {len(all_tickers)}")
    
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
    
    # Select only required columns
    required_cols = ['ticker', 'trading_date', 'open', 'high', 'low', 'close', 'volume']
    available_cols = [c for c in required_cols if c in df.columns]
    df = df[available_cols]
    
    # Drop rows without required identifiers
    df = df.dropna(subset=['ticker', 'trading_date'])
    
    print(f"[daily_price] Successfully collected {len(df)} records for {date_str}")
    return df
