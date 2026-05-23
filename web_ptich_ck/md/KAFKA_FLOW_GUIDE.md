# Hướng dẫn Vận hành Luồng Dữ liệu Realtime (Kafka → MinIO → DB)

Tài liệu này hướng dẫn cách chạy, kiểm tra và chuyển đổi giữa luồng dữ liệu giả lập (Test) và luồng dữ liệu thật từ WebSocket (Production).

---

## 🏗️ 1. Khởi động Hạ tầng (Infrastructure)

Trước khi chạy các producer, hãy đảm bảo Kafka và MinIO đã sẵn sàng:

```bash
cd D:/project/lakehouse_ptich_ck/kafka
docker-compose up -d zookeeper kafka kafka-ui
```

- **Kafka UI:** Truy cập [http://localhost:8081](http://localhost:8081) để theo dõi các topic.
- **MinIO Console:** Truy cập [http://localhost:9001](http://localhost:9001) (User: `minioadmin` / Pass: `minioadmin`).

---

## 🧪 2. Chạy luồng TEST (Dữ liệu giả lập)

Sử dụng khi cần kiểm tra hệ thống, test logic đóng gói Parquet hoặc kiểm tra Airflow mà không cần kết nối tới socket thật.

### Bước 1: Khởi động Mock Producer và Consumer
```bash
docker-compose up -d mock-producer minio-sink-consumer
```

- **mock-producer:** Tự động tạo dữ liệu chứng khoán giả lập mỗi 1 giây.
- **minio-sink-consumer:** Gom dữ liệu từ Kafka và đẩy lên MinIO (mỗi 5 phút hoặc 1000 records).

### Bước 2: Kiểm tra dữ liệu
1. Vào Kafka UI, chọn topic `market.quotes.raw` -> Tab **Messages** để xem dữ liệu đang đổ về.
2. Sau khoảng 5-10 phút, kiểm tra bucket `thongtin-congty-va-bctc` trên MinIO xem đã có file `.parquet` chưa.

---

## 🚀 3. Chuyển sang luồng THẬT (WebSocket Simplize)

Khi hệ thống đã ổn định và bạn muốn nhận dữ liệu thực tế từ thị trường.

### Bước 1: Dừng luồng Test
```bash
docker-compose stop mock-producer
```

### Bước 2: Khởi động Producer thật
```bash
docker-compose up -d realtime-producer
```

- **realtime-producer:** Sẽ kết nối tới `wss://stream2.simplize.vn/ws`, subscribe toàn bộ mã chứng khoán và đẩy về Kafka.
- **Lưu ý:** Vẫn giữ `minio-sink-consumer` chạy để tiếp tục đẩy dữ liệu lên MinIO.

---

## 🔄 4. Đồng bộ dữ liệu vào Database (Airflow)

Sau khi dữ liệu đã nằm trong MinIO dưới dạng file Parquet, Airflow sẽ đảm nhận việc đưa vào Postgres.

1. Truy cập Airflow UI: [http://localhost:8080](http://localhost:8080).
2. Tìm DAG: `kafka_realtime_minio_to_db`.
3. Bật (**Unpause**) DAG này. 
4. DAG sẽ tự động kiểm tra thư mục theo giờ trên MinIO và thực hiện **Upsert** vào bảng `hethong_phantich_chungkhoan.realtime_quotes`.

---

## 🛠️ 5. Xử lý sự cố thường gặp (Troubleshooting)

| Vấn đề | Nguyên nhân | Cách xử lý |
| :--- | :--- | :--- |
| **Kafka không nhận tin nhắn** | Producer chưa kết nối được | Kiểm tra log: `docker-compose logs -f realtime-producer` |
| **Không thấy file trên MinIO** | Consumer chưa đủ 1000 tin hoặc chưa đủ 5p | Đợi thêm hoặc chỉnh `BATCH_SIZE` nhỏ lại trong `minio_sink_consumer.py` để test |
| **Airflow DAG báo lỗi** | Lỗi kết nối DB hoặc Schema | Kiểm tra Connection `dwh_postgres` trong Airflow |

---
*Người soạn: Gemini CLI Agent*
*Ngày cập nhật: 05/05/2026*
