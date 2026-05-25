@echo off
echo ========================================================
echo KHOI DONG TOAN BO HE THONG (WEB VA DATA PIPELINE)
echo ========================================================

echo.
echo 1. Dang khoi dong cac container cua Data Pipeline (ETL)...
cd data_pipeline\etl
docker-compose up -d
cd ..\..

echo.
echo 2. Dang khoi dong cac container cua Web App...
cd web_ptich_ck
docker-compose up -d
cd ..

echo.
echo Da khoi dong hoan toan cac container!
pause
