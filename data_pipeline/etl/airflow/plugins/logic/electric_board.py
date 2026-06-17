import time
from datetime import datetime

import pandas as pd
from vnstock import Trading


def _retry_price_board(symbols: list, retries: int = 3, base_delay: float = 2.0) -> pd.DataFrame:
    """Call vnstock Trading.price_board với retry logic cho rate-limit errors."""
    for attempt in range(retries):
        try:
            # Tạo Trading object với symbol bất kỳ (yêu cầu đầu vào của API)
            trading = Trading(symbol='VN30F1M')
            df = trading.price_board(symbols_list=symbols)
            return df if isinstance(df, pd.DataFrame) else pd.DataFrame()
        except Exception as exc:
            msg = str(exc)
            if "429" in msg or "Too Many Requests" in msg:
                wait = base_delay * (attempt + 1)
                print(f"[ELECTRIC_BOARD] 429 Too Many Requests, retry {attempt + 1}/{retries} in {wait:.1f}s")
                time.sleep(wait)
                continue
            print(f"[ELECTRIC_BOARD] Error: {exc}")
            return pd.DataFrame()
    return pd.DataFrame()


def _flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten multi-level columns từ tuple thành string với underscore."""
    if df is None or df.empty:
        return df
    
    # vnstock trả về columns dạng tuple: ('listing', 'symbol'), ('bid_ask', 'bid_1_price'), ...
    new_columns = []
    for col in df.columns:
        if isinstance(col, tuple):
            # Join các phần tử của tuple bằng underscore
            new_col = '_'.join(str(c) for c in col if c)
            new_columns.append(new_col)
        else:
            new_columns.append(str(col))
    
    df.columns = new_columns
    return df


def get_price_board_batch(symbols: list, trading_date: str = None) -> pd.DataFrame:
    """
    Lấy dữ liệu bảng giá giao dịch cho một batch symbols.
    
    Args:
        symbols: List mã cổ phiếu cần lấy dữ liệu
        trading_date: Ngày giao dịch (format YYYY-MM-DD), mặc định là ngày hiện tại
        
    Returns:
        DataFrame với dữ liệu bảng giá đã lọc, columns đã được flatten
    """
    if not symbols:
        return pd.DataFrame()
    
    # Lấy trading_date nếu không được truyền vào
    if trading_date is None:
        trading_date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"[ELECTRIC_BOARD] Fetching price board for {len(symbols)} symbols: {symbols[:5]}...")
    
    # Gọi API lấy dữ liệu
    df = _retry_price_board(symbols)
    
    if df is None or df.empty:
        print(f"[ELECTRIC_BOARD] No data returned for symbols: {symbols[:5]}...")
        return pd.DataFrame()
    
    # Flatten multi-level columns
    df = _flatten_columns(df)
    
    # Lọc chỉ giữ các mã có trạng thái giao dịch = 20 (đang giao dịch)
    # Note: trading_status_code có thể là string hoặc int
    if 'listing_trading_status_code' in df.columns:
        df = df[df['listing_trading_status_code'].astype(str) == '20']
        print(f"[ELECTRIC_BOARD] Filtered to {len(df)} rows with trading_status_code = 20")
    
    # Danh sách các cột cần giữ lại (hỗ trợ cả vnstock cũ và vnstock 4.0+)
    selected_columns = [
        # Cột định dạng cũ
        'listing_symbol',
        'listing_exchange',
        'listing_ref_price',
        'match_match_price',
        'match_accumulated_volume',
        'match_highest',
        'match_lowest',
        'match_foreign_buy_volume',
        'match_foreign_sell_volume',
        'bid_ask_bid_1_price', 'bid_ask_bid_1_volume',
        'bid_ask_bid_2_price', 'bid_ask_bid_2_volume',
        'bid_ask_bid_3_price', 'bid_ask_bid_3_volume',
        'bid_ask_ask_1_price', 'bid_ask_ask_1_volume',
        'bid_ask_ask_2_price', 'bid_ask_ask_2_volume',
        'bid_ask_ask_3_price', 'bid_ask_ask_3_volume',
        
        # Cột định dạng mới (vnstock 4.0+)
        'symbol',
        'exchange',
        'reference_price',
        'close_price',
        'volume_accumulated',
        'high_price',
        'low_price',
        'foreign_buy_volume',
        'foreign_sell_volume',
        'bid_price_1', 'bid_vol_1',
        'bid_price_2', 'bid_vol_2',
        'bid_price_3', 'bid_vol_3',
        'ask_price_1', 'ask_vol_1',
        'ask_price_2', 'ask_vol_2',
        'ask_price_3', 'ask_vol_3',
    ]
    
    # Chỉ giữ lại các cột có trong DataFrame
    available_columns = [col for col in selected_columns if col in df.columns]
    df = df[available_columns]
    
    # Thêm cột trading_date
    df['trading_date'] = trading_date
    
    print(f"[ELECTRIC_BOARD] ✅ Fetched {len(df)} rows, {len(df.columns)} columns")
    
    return df


def get_electric_board_all(target_date: str = None, **kwargs) -> pd.DataFrame:
    """
    Lấy dữ liệu bảng giá giao dịch cho tất cả các mã cổ phiếu.
    Hoạt động tương tự daily_price nhưng cho bảng giá.
    """
    from logic.list_macp import get_all_tickers
    
    date_str = target_date or datetime.now().strftime("%Y-%m-%d")
    print(f"[ELECTRIC_BOARD] Fetching all tickers for {date_str}...")
    
    all_tickers = get_all_tickers()
    
    # Split into batches of 300 to avoid any API payload or URL size limitations
    batch_size = 300
    batches = [all_tickers[i:i + batch_size] for i in range(0, len(all_tickers), batch_size)]
    
    frames = []
    for idx, batch in enumerate(batches, 1):
        print(f"[ELECTRIC_BOARD] Fetching batch {idx}/{len(batches)} (size={len(batch)})...")
        df = get_price_board_batch(batch, trading_date=date_str)
        if not df.empty:
            frames.append(df)
        time.sleep(1.0)  # safety delay
        
    if not frames:
        print(f"[ELECTRIC_BOARD] ⚠️ No electric board data collected for {date_str}")
        return pd.DataFrame()
        
    df_all = pd.concat(frames, ignore_index=True)
    print(f"[ELECTRIC_BOARD] Successfully collected {len(df_all)} records for {date_str}")
    return df_all

