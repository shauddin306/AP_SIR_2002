import json
from bs4 import BeautifulSoup

json_path = "results/surya/page_3/results.json"
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

image_name = "page_3"
page_data = data[image_name][0]
html_content = ""
for block in page_data.get('blocks', []):
    if 'html' in block:
        html_content += block['html']

print("HTML Content length:", len(html_content))
soup = BeautifulSoup(html_content, 'html.parser')
extracted_voters = []

for tr in soup.find_all('tr'):
    cols = tr.find_all(['td', 'th'])
    cols_text = [c.get_text(strip=True) for c in cols]
    print("Row:", cols_text)
    if len(cols_text) >= 8 and cols_text[0].isdigit():
        extracted_voters.append(cols_text)

print("Extracted:", len(extracted_voters))
