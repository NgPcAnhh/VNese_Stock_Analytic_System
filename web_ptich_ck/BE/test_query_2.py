import psycopg2
conn = psycopg2.connect("postgresql://admin:123456@localhost:5432/postgres")
cur = conn.cursor()
cur.execute("SELECT symbol, ts, last_price, last_volume FROM hethong_phantich_chungkhoan.realtime_quotes ORDER BY ts DESC LIMIT 10")
rows = cur.fetchall()
for r in rows:
    print(r)
cur.close()
conn.close()
