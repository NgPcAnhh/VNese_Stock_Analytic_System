import urllib.request
import json
import sys

def test_api():
    try:
        req = urllib.request.Request("http://localhost:8000/api/v1/tong-quan/market-comparison")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Status Code: {response.getcode()}")
            print(f"Items returned: {len(data)}")
            for idx, item in enumerate(data[:3]):
                print(f"[{idx}] {item}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_api()
