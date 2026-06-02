import urllib.request
import urllib.error

url = "https://arxevo-production.up.railway.app/health"
print(f"Testing {url} ...")
try:
    response = urllib.request.urlopen(url, timeout=5)
    print(f"Success! Status Code: {response.getcode()}")
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    print(e.read().decode('utf-8'))
except urllib.error.URLError as e:
    print(f"URL Error (Server down or unreachable): {e.reason}")
except Exception as e:
    print(f"Other Error: {str(e)}")
