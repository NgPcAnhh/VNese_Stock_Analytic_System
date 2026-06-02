import boto3
import pandas as pd
import io
import time

s3_client = boto3.client(
    's3',
    endpoint_url="http://localhost:9000",
    aws_access_key_id="admin",
    aws_secret_access_key="12345678",
    region_name='us-east-1'
)

try:
    response = s3_client.list_objects_v2(Bucket="thongtin-congty-va-bctc", Prefix="realtime/")
    if 'Contents' in response:
        print("Found parquet files:")
        for obj in response['Contents'][:3]:
            print(f"Key: {obj['Key']}, Size: {obj['Size']}")
            # Read one file
            file_obj = s3_client.get_object(Bucket="thongtin-congty-va-bctc", Key=obj['Key'])
            df = pd.read_parquet(io.BytesIO(file_obj['Body'].read()))
            print("Columns:", df.columns.tolist())
            print(df[['symbol', 'ts']].head(5) if 'ts' in df.columns else df.head(5))
    else:
        print("No files found under realtime/")
except Exception as e:
    print("Error:", e)
