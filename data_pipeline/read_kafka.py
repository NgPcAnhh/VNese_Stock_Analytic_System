from kafka import KafkaConsumer
import json
import time

for topic in ['stock-quotes', 'market.quotes.raw']:
    try:
        print(f"Trying topic: {topic}...")
        consumer = KafkaConsumer(
            topic,
            bootstrap_servers=['localhost:9092'],
            auto_offset_reset='earliest',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            consumer_timeout_ms=3000
        )
        count = 0
        for message in consumer:
            print(f"Key: {message.key}, Value: {message.value}")
            count += 1
            if count >= 2:
                break
        consumer.close()
    except Exception as e:
        print(f"Error on {topic}:", e)
