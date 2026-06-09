import json
import os
from bs4 import BeautifulSoup

json_path = "results/surya/page_5/results.json"
if os.path.exists(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    page_data = data["page_5"][0]
    html_content = ""
    for block in page_data.get('blocks', []):
        if 'html' in block:
            html_content += block['html']
            
    soup = BeautifulSoup(html_content, 'html.parser')
    rows = soup.find_all('tr')
    print("--- Surya OCR parsed rows for Page 5 ---")
    for tr in rows:
        cols = tr.find_all(['td', 'th'])
        cols_text = [c.get_text(strip=True) for c in cols]
        print(cols_text)
else:
    print("JSON file not found.")
