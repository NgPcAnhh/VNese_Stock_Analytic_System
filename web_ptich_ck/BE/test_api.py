import urllib.request
import json
import sys

def test_api():
    try:
        req = urllib.request.Request("http://localhost:8000/api/v1/stock/VIC/overview")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Status Code: {response.getcode()}")
            print(f"Keys: {list(data.keys())}")
            ob = data.get("orderBook", [])
            print(f"Order book length: {len(ob)}")
            for idx, item in enumerate(ob[:5]):
                print(f"[{idx}] {item}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_api()
