import cv2
import numpy as np

img = cv2.imread('temp_pages/page_3.jpg')
if img is None:
    print("Failed to load image")
    exit(1)

h_img, w_img = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
thresh = cv2.adaptiveThreshold(
    gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 10
)

# Detect lines using kernels
horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w_img // 15, 1))
detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)

vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h_img // 30))
detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

table_mask = cv2.add(detect_horizontal, detect_vertical)
contours, _ = cv2.findContours(table_mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

print(f"Total contours: {len(contours)}")
print("--- Contours (Sorted by area descending) ---")
bboxes = [cv2.boundingRect(c) for c in contours]
# Sort by area
bboxes = sorted(bboxes, key=lambda b: b[2] * b[3], reverse=True)

for i, (x, y, w, h) in enumerate(bboxes[:30]):
    w_ratio = w / w_img
    h_ratio = h / h_img
    print(f"Rank {i}: x={x}, y={y}, w={w} (w_ratio={w_ratio:.3f}), h={h} (h_ratio={h_ratio:.3f}), area={w*h}")
