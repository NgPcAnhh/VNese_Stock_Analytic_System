@echo off
echo ========================================================
echo DUNG TOAN BO HE THONG (WEB VA DATA PIPELINE)
echo ========================================================

echo.
echo 1. Dang tat cac container cua Web App...
cd web_ptich_ck
docker-compose down
cd ..

echo.
echo 2. Dang tat cac container cua Data Pipeline (ETL)...
cd data_pipeline\etl
docker-compose down
cd ..\..

echo.
echo Da dong hoan toan cac container! Khong con chuong trinh nao chay ngam.
pause
