FROM python:3.11-slim

# Cài đặt một số dependencies cần thiết cho hệ thống và Redis Server
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirement trước để cache layer
COPY requirements.txt .

# Cài đặt thư viện Python
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ source code
COPY . .

EXPOSE 8000
# Expose port redis nếu cần truy cập từ ngoài (không bắt buộc vì dùng localhost bên trong)
EXPOSE 6379 

# Tạo một script để chạy cả Redis và Uvicorn
RUN echo '#!/bin/bash\n\
# Khởi động Redis chạy ngầm\n\
redis-server --daemonize yes\n\
\n\
# Khởi động Backend\n\
uvicorn app.main:app --host 0.0.0.0 --port 8000\n\
' > /app/start_services.sh && chmod +x /app/start_services.sh

# Chạy script khởi động
CMD ["/app/start_services.sh"]
