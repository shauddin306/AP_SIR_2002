import requests
import base64

with open('python-engine-ocr/debug_input.jpg', 'rb') as f:
    img_data = base64.b64encode(f.read()).decode('utf-8')

url = "https://apsir2002-production-09f2.up.railway.app/extract"
try:
    res = requests.post(url, json={"image_base64": img_data, "page_no": 1})
    print(res.status_code)
    print(res.text)
except Exception as e:
    print("Failed:", e)
