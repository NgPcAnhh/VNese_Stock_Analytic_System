from contextlib import closing
import pandas as pd
from psycopg2.extras import execute_values
from lake_to_dwh.utils import (
    get_latest_partition,
    read_all_csvs_from_folder,
    get_postgres_connection,
    ensure_schema,
    clean_dataframe,
    standardize_ticker,
    parse_trading_date
)


def sync_daily_price_to_db(
    db_url: str,
    schema: str,
    bucket: str,
    minio_conn_id: str = "minio_finance",
    folder_prefix: str = "daily_price/",
    table: str = "history_price"
) -> str:
    print("=" * 70)
    print("📊 SYNC DAILY PRICE TO DATABASE")
    print("=" * 70)
    
    # Step 1: Find latest partition
    print("\n[1/4] Finding latest partition...")
    latest_partition = get_latest_partition(bucket, folder_prefix, minio_conn_id)
    
    if not latest_partition:
        return "❌ No partition found"
    
    # Step 2: Read all CSV files from latest partition
    print("\n[2/4] Reading CSV files...")
    df = read_all_csvs_from_folder(bucket, latest_partition, minio_conn_id)
    
    if df.empty:
        return "⚠️ No data found"
    
    print(f"Loaded {len(df)} rows")
    
    # Step 3: Clean and transform data
    print("\n[3/4] Cleaning and transforming data...")
    
    # Normalize column names
    df.columns = df.columns.str.lower().str.strip()
    
    # Ensure required columns exist
    required_cols = ['ticker', 'trading_date', 'open', 'high', 'low', 'close', 'volume']
    
    # Handle date column variations
    if 'date' in df.columns and 'trading_date' not in df.columns:
        df.rename(columns={'date': 'trading_date'}, inplace=True)
    if 'time' in df.columns and 'trading_date' not in df.columns:
        df.rename(columns={'time': 'trading_date'}, inplace=True)
    
    # Check required columns
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        return f"❌ Missing columns: {missing_cols}"
    
    # Select only required columns
    df = df[required_cols].copy()
    
    # Clean data
    df = clean_dataframe(df, required_columns=['ticker', 'trading_date'])
    df = standardize_ticker(df, 'ticker')
    df = parse_trading_date(df, 'trading_date')
    
    # Remove duplicates
    df = df.drop_duplicates(subset=['ticker', 'trading_date'])
    
    # --- Step 3.5: Fallback Sync using Electric Board Price Data ---
    print("\n[3.5] Merging with electric board price data as fallback...")
    try:
        import re
        from lake_to_dwh.utils import get_minio_hook
        
        # Extract the partition date (YYYY-MM-DD)
        date_match = re.search(r'\d{4}-\d{2}-\d{2}', latest_partition)
        if date_match:
            partition_date = date_match.group(0)
        else:
            partition_date = latest_partition.strip("/").split("/")[-1].replace("date=", "").replace("dt=", "")
            
        print(f"Partition date determined: {partition_date}")
        
        # Check if corresponding partition exists in electric_board_per_day
        eb_folder = f"electric_board_per_day/{partition_date}/"
        hook = get_minio_hook(minio_conn_id)
        eb_keys = hook.list_keys(bucket_name=bucket, prefix=eb_folder)
        if not eb_keys:
            eb_folder = f"electric_board_per_day/date={partition_date}/"
            eb_keys = hook.list_keys(bucket_name=bucket, prefix=eb_folder)
            
        if eb_keys:
            print(f"Found electric board partition folder: {eb_folder} containing {len(eb_keys)} files.")
            df_eb = read_all_csvs_from_folder(bucket, eb_folder, minio_conn_id)
            if not df_eb.empty:
                # Normalize columns to lowercase and strip whitespace
                df_eb.columns = df_eb.columns.str.lower().str.strip()
                
                # Dynamic options for column mapping
                eb_ticker_opts = ['symbol', 'listing_symbol', 'ticker']
                eb_date_opts = ['trading_date']
                eb_close_opts = ['close_price', 'match_match_price', 'match_price', 'close']
                eb_open_opts = ['open_price', 'open'] + eb_close_opts
                eb_high_opts = ['high_price', 'match_highest', 'highest_price', 'high']
                eb_low_opts = ['low_price', 'match_lowest', 'lowest_price', 'low']
                eb_volume_opts = ['volume_accumulated', 'match_accumulated_volume', 'accumulated_volume', 'volume']
                
                def find_first_existing(df_input, opts):
                    for opt in opts:
                        if opt in df_input.columns:
                            return opt
                    return None
                    
                ticker_col = find_first_existing(df_eb, eb_ticker_opts)
                date_col = find_first_existing(df_eb, eb_date_opts)
                open_col = find_first_existing(df_eb, eb_open_opts)
                high_col = find_first_existing(df_eb, eb_high_opts)
                low_col = find_first_existing(df_eb, eb_low_opts)
                close_col = find_first_existing(df_eb, eb_close_opts)
                volume_col = find_first_existing(df_eb, eb_volume_opts)
                
                if not (ticker_col and date_col and close_col):
                    print("⚠️ Missing key columns in electric board data to map to history_price.")
                else:
                    df_eb_mapped = pd.DataFrame()
                    df_eb_mapped['ticker'] = df_eb[ticker_col]
                    df_eb_mapped['trading_date'] = df_eb[date_col]
                    df_eb_mapped['open'] = df_eb[open_col] if open_col else df_eb[close_col]
                    df_eb_mapped['high'] = df_eb[high_col] if high_col else df_eb[close_col]
                    df_eb_mapped['low'] = df_eb[low_col] if low_col else df_eb[close_col]
                    df_eb_mapped['close'] = df_eb[close_col]
                    df_eb_mapped['volume'] = df_eb[volume_col] if volume_col else 0
                    
                    # Clean and standardize electric board dataframe
                    df_eb_mapped = clean_dataframe(df_eb_mapped, required_columns=['ticker', 'trading_date'])
                    df_eb_mapped = standardize_ticker(df_eb_mapped, 'ticker')
                    df_eb_mapped = parse_trading_date(df_eb_mapped, 'trading_date')
                    df_eb_mapped = df_eb_mapped.drop_duplicates(subset=['ticker', 'trading_date'])
                    
                    # Convert to numeric and divide price columns by 1000.0 (raw VND to thousands of VND)
                    for col in ['open', 'high', 'low', 'close']:
                        df_eb_mapped[col] = pd.to_numeric(df_eb_mapped[col], errors='coerce').fillna(0.0) / 1000.0
                    df_eb_mapped['volume'] = pd.to_numeric(df_eb_mapped['volume'], errors='coerce').fillna(0).astype('int64')
                    
                    # Perform merge/upsert with df
                    df.set_index(['ticker', 'trading_date'], inplace=True, drop=False)
                    df_eb_mapped.set_index(['ticker', 'trading_date'], inplace=True, drop=False)
                    
                    # Ensure OHLCV + volume columns in df are numeric and fill NaNs with 0
                    for col in ['open', 'high', 'low', 'close', 'volume']:
                        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                        
                    # Condition: all of these 5 columns are <= 0
                    is_all_zero = (
                        (df['open'] == 0) & 
                        (df['high'] == 0) & 
                        (df['low'] == 0) & 
                        (df['close'] == 0) & 
                        (df['volume'] == 0)
                    )
                    zero_keys = df[is_all_zero].index
                    
                    # Update keys in df that are all zero but exist in df_eb_mapped
                    keys_to_update = zero_keys.intersection(df_eb_mapped.index)
                    if not keys_to_update.empty:
                        print(f"Updating {len(keys_to_update)} rows in df_daily with electric board data...")
                        cols_to_update = ['open', 'high', 'low', 'close', 'volume']
                        df.loc[keys_to_update, cols_to_update] = df_eb_mapped.loc[keys_to_update, cols_to_update]
                        
                    # Add keys that are in df_eb_mapped but NOT in df_daily
                    new_keys = df_eb_mapped.index.difference(df.index)
                    if not new_keys.empty:
                        print(f"Adding {len(new_keys)} new rows from electric board...")
                        df_new = df_eb_mapped.loc[new_keys]
                        df = pd.concat([df, df_new])
                        
                    df.reset_index(drop=True, inplace=True)
                    print(f"Merge complete. Total rows: {len(df)}")
            else:
                print("⚠️ Electric board DataFrame was empty")
        else:
            print(f"⚠️ No corresponding electric board partition found for {partition_date} in MinIO")
    except Exception as eb_err:
        print(f"⚠️ Error during merging electric board data: {str(eb_err)}")
        import traceback
        traceback.print_exc()
        if 'df' in locals() and isinstance(df.index, pd.MultiIndex):
            df = df.reset_index(drop=True)
    # -------------------------------------------------------------
    
    print(f"After cleaning: {len(df)} rows")
    
    if df.empty:
        return "⚠️ No data after cleaning"
    
    # Step 4: Insert into database
    print("\n[4/4] Inserting into database...")
    
    with closing(get_postgres_connection(db_url)) as conn:
        conn.autocommit = False
        
        try:
            # Ensure schema exists
            ensure_schema(conn, schema)
            
            # Prepare data for insertion
            rows = [
                (
                    row['ticker'],
                    row['trading_date'],
                    row.get('open'),
                    row.get('high'),
                    row.get('low'),
                    row.get('close'),
                    row.get('volume'),
                )
                for _, row in df.iterrows()
            ]
            
            # UPSERT pattern using ON CONFLICT
            with conn.cursor() as cur:
                # Insert with ON CONFLICT DO UPDATE
                upsert_sql = f"""
                    INSERT INTO {schema}.{table}
                    (ticker, trading_date, open, high, low, close, volume)
                    VALUES %s
                    ON CONFLICT (ticker, trading_date)
                    DO UPDATE SET
                        open = EXCLUDED.open,
                        high = EXCLUDED.high,
                        low = EXCLUDED.low,
                        close = EXCLUDED.close,
                        volume = EXCLUDED.volume;
                """
                execute_values(cur, upsert_sql, rows)
            
            conn.commit()
            print(f"✅ Inserted/Updated {len(rows)} rows")
            
            return f"✅ Success: {len(rows)} rows"
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error: {str(e)}")
            raise
    
    print("=" * 70)
