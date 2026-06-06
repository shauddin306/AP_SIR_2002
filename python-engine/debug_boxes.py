import cv2
import numpy as np
import urllib.request
import pypdfium2 as pdfium
import sys

url = "https://www.eci.gov.in/sir/f1/S01/data/OLDSIRROLL/S01/152/S01_152_80.pdf"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        pdf_bytes = response.read()
except Exception as e:
    print(f"Failed to download: {e}")
    sys.exit(1)

pdf = pdfium.PdfDocument(pdf_bytes)
print(f"Downloaded PDF with {len(pdf)} pages.")

# Pick page 2 (0-indexed, so 3rd page which usually has voter data)
page = pdf[2]
bitmap = page.render(scale=2.0)  # scale=2.0 usually gives ~144 DPI
pil_image = bitmap.to_pil()
img = np.array(pil_image)
# Convert RGB to BGR for OpenCV
img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

cv2.imwrite("debug_page.jpg", img)

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
thresh = cv2.adaptiveThreshold(
    gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 10
)
cv2.imwrite("debug_thresh.jpg", thresh)

horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)

vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

table_mask = cv2.add(detect_horizontal, detect_vertical)
cv2.imwrite("debug_table_mask.jpg", table_mask)

contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"Found {len(contours)} initial contours.")

h_img, w_img = img.shape[:2]
expected_w = w_img / 3.0
expected_h = h_img / 10.0

print(f"Expected W: {expected_w}, Expected H: {expected_h}")

boxes = []
for c in contours:
    x, y, w, h = cv2.boundingRect(c)
    if (expected_w * 0.7 < w < expected_w * 1.3) and (expected_h * 0.7 < h < expected_h * 1.3):
        boxes.append((x, y, w, h))
    else:
        # print(f"Rejected box: w={w}, h={h}")
        pass

print(f"Filtered to {len(boxes)} valid boxes!")
