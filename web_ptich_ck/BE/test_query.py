import psycopg2
try:
    conn = psycopg2.connect("postgresql://admin:123456@localhost:5432/postgres")
    cur = conn.cursor()
    cur.execute("SELECT extract(year from ts) as yr, count(*) FROM hethong_phantich_chungkhoan.realtime_quotes GROUP BY yr")
    rows = cur.fetchall()
    print("Found years for all symbols:")
    for r in rows:
        print(f"Year: {r[0]}, Count: {r[1]}")
    cur.close()
    conn.close()
except Exception as e:
    print("Error:", e)
