import psycopg2
import json

def check_data():
    try:
        conn = psycopg2.connect("postgresql://admin:123456@localhost:5432/postgres")
        cur = conn.cursor()
        
        # 1. Latest trading date
        cur.execute("SELECT MAX(trading_date) FROM hethong_phantich_chungkhoan.history_price")
        latest_date = cur.fetchone()[0]
        print(f"Latest trading date: {latest_date}")
        
        # 2. Total stocks in company_overview
        cur.execute("SELECT COUNT(*) FROM hethong_phantich_chungkhoan.company_overview WHERE exchange IS NOT NULL AND BTRIM(exchange) NOT IN ('NaN', 'DELISTED')")
        total_stocks = cur.fetchone()[0]
        print(f"Total stocks in company_overview: {total_stocks}")
        
        # 3. Stocks missing from history_price on latest_date
        cur.execute("""
            SELECT COUNT(*) 
            FROM hethong_phantich_chungkhoan.company_overview co
            LEFT JOIN hethong_phantich_chungkhoan.history_price hp 
              ON hp.ticker = co.ticker AND hp.trading_date = %s
            WHERE co.exchange IS NOT NULL AND BTRIM(co.exchange) NOT IN ('NaN', 'DELISTED')
              AND hp.ticker IS NULL
        """, (latest_date,))
        missing_on_latest = cur.fetchone()[0]
        print(f"Stocks missing price on latest_date: {missing_on_latest}")
        
        # 4. Stocks missing from history_price entirely
        cur.execute("""
            SELECT COUNT(*) 
            FROM hethong_phantich_chungkhoan.company_overview co
            LEFT JOIN (SELECT DISTINCT ticker FROM hethong_phantich_chungkhoan.history_price) hp 
              ON hp.ticker = co.ticker
            WHERE co.exchange IS NOT NULL AND BTRIM(co.exchange) NOT IN ('NaN', 'DELISTED')
              AND hp.ticker IS NULL
        """, )
        missing_entirely = cur.fetchone()[0]
        print(f"Stocks missing history_price entirely: {missing_entirely}")
        
        # 5. Check some sample stocks missing price
        cur.execute("""
            SELECT co.ticker, co.organ_short_name
            FROM hethong_phantich_chungkhoan.company_overview co
            LEFT JOIN hethong_phantich_chungkhoan.history_price hp 
              ON hp.ticker = co.ticker AND hp.trading_date = %s
            WHERE co.exchange IS NOT NULL AND BTRIM(co.exchange) NOT IN ('NaN', 'DELISTED')
              AND hp.ticker IS NULL
            LIMIT 10
        """, (latest_date,))
        samples = cur.fetchall()
        print("Sample stocks missing price on latest_date:")
        for s in samples:
            print(f"  {s[0]}: {s[1]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_data()
