import asyncio
import json
from websockets.asyncio.client import connect

async def test_ws():
    url = "wss://stream2.simplize.vn/ws"
    headers = {
        "Origin": "https://simplize.vn",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
    }
    async with connect(url, additional_headers=list(headers.items())) as ws:
        print("Connected")
        # Subscribe to VIC
        sub_msg = {
            "event": "sub",
            "topic": "STOCK_RETIME_LIST",
            "params": ["VIC"]
        }
        await ws.send(json.dumps(sub_msg))
        print("Subscribed to VIC")
        
        count = 0
        async for msg in ws:
            print("Received:", msg)
            count += 1
            if count >= 5:
                break

asyncio.run(test_ws())
