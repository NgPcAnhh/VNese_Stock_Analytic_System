import sys
from pathlib import Path

# Thêm đường dẫn BE vào sys.path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.database.database import SessionLocal, engine

def test_database_connection():
    """Kiểm tra kết nối database có thành công không"""
    try:
        # Kiểm tra engine kết nối được hay không
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✓ Kết nối database thành công!")
            print(f"  Test query result: {result.fetchone()}")
            return True
    except Exception as e:
        print(f"✗ Lỗi kết nối database: {str(e)}")
        return False

def test_custom_query():
    """Kiểm tra thực thi một câu truy vấn nghiệp vụ thực tế"""
    # Khởi tạo db bên ngoài try để dễ dàng close trong block finally
    db = SessionLocal()
    try:
        # Sử dụng câu truy vấn tối ưu đã bàn trước đó làm test case
        query = text("""
            SELECT
                cur.trading_date,
                t.ticker,
                cur.close AS value,
                cur.close - prev.close AS change,
                CASE WHEN prev.close > 0
                    THEN ROUND(((cur.close - prev.close) / prev.close * 100)::numeric, 2)
                    ELSE 0 END AS percent
            FROM (VALUES
                ('VNINDEX', 1),
                ('VN30', 2),
                ('HNXINDEX', 3),
                ('UPCOMINDEX', 4)
            ) AS t(ticker, sort_order)
            CROSS JOIN LATERAL (
                SELECT close, trading_date
                FROM market_index
                WHERE ticker = t.ticker
                ORDER BY trading_date DESC
                LIMIT 1
            ) cur
            CROSS JOIN LATERAL (
                SELECT close
                FROM market_index
                WHERE ticker = t.ticker
                ORDER BY trading_date DESC
                OFFSET 1 LIMIT 1
            ) prev
            ORDER BY t.sort_order;
        """)

        print("  Đang chạy truy vấn...")
        result = db.execute(query)
        rows = result.fetchall()
        
        if rows:
            print(f"✓ Truy vấn thành công! Lấy được {len(rows)} dòng dữ liệu:")
            # In ra các cột để dễ nhìn (bạn có thể tuỳ chỉnh theo ý muốn)
            for row in rows:
                print(f"  - Ticker: {row[0]}, Giá: {row[1]}, Thay đổi: {row[2]}, %: {row[3]}%")
        else:
            print("⚠ Truy vấn chạy thành công nhưng bảng market_index chưa có dữ liệu.")
            
        return True
    except Exception as e:
        print(f"✗ Lỗi thực thi truy vấn: {str(e)}")
        return False
    finally:
        # Sử dụng finally để đảm bảo session luôn được đóng dù code có lỗi hay không
        db.close()

    
if __name__ == "__main__":
    print("=" * 50)
    print("TEST KẾT NỐI DATABASE")
    print("=" * 50)
    
    print("\n1. Kiểm tra kết nối engine...")
    test_database_connection()
    
    print("\n4. Kiểm tra truy vấn lấy dữ liệu thị trường...")
    test_custom_query()
    
    print("\n" + "=" * 50)