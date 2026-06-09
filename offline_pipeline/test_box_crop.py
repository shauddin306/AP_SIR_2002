import cv2
import numpy as np

img = cv2.imread('temp_pages/page_3.jpg')
if img is None:
    print("Failed to load temp_pages/page_3.jpg")
    exit(1)

h_img, w_img = img.shape[:2]
print(f"Image Size: {w_img}x{h_img}")

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
thresh = cv2.adaptiveThreshold(
    gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 10
)

horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w_img // 15, 1))
detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)

vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h_img // 30))
detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

table_mask = cv2.add(detect_horizontal, detect_vertical)

contours, _ = cv2.findContours(table_mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
print(f"Total contours: {len(contours)}")

# Print sizes of the first 20 contours
print("--- Sample Contours ---")
for i, c in enumerate(contours[:20]):
    x, y, w, h = cv2.boundingRect(c)
    w_ratio = w / w_img
    h_ratio = h / h_img
    print(f"Contour {i}: x={x}, y={y}, w={w} (ratio={w_ratio:.3f}), h={h} (ratio={h_ratio:.3f})")

# Let's count how many match other width/height ranges
matching = 0
for c in contours:
    x, y, w, h = cv2.boundingRect(c)
    # Print the constraints:
    # (w_img * 0.25 < w < w_img * 0.4) and (h_img * 0.05 < h < h_img * 0.15)
    w_ok = w_img * 0.25 < w < w_img * 0.4
    h_ok = h_img * 0.05 < h < h_img * 0.15
    if w_ok and h_ok:
        matching += 1
print(f"Matching contours under constraints: {matching}")
