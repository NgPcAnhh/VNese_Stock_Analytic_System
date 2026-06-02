from kafka import KafkaConsumer
import json
import time

try:
    consumer = KafkaConsumer(
        'stock-quotes',
        bootstrap_servers=['localhost:9092'],
        auto_offset_reset='earliest',
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        consumer_timeout_ms=5000
    )
    print("Consuming from stock-quotes...")
    count = 0
    for message in consumer:
        print(f"Key: {message.key}, Value: {message.value}")
        count += 1
        if count >= 3:
            break
    consumer.close()
except Exception as e:
    print("Error:", e)
