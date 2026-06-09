import cv2
import numpy as np

img = cv2.imread('temp_pages/page_3.jpg')
if img is None:
    print("Failed to load image")
    exit(1)

h_img, w_img = img.shape[:2]
print(f"Image Size: {w_img}x{h_img}")

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
thresh = cv2.adaptiveThreshold(
    gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 10
)

# Test different kernels and constraints
horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w_img // 25, 1)) # smaller kernel to handle shorter lines
detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)

vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h_img // 40))
detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

table_mask = cv2.add(detect_horizontal, detect_vertical)
contours, _ = cv2.findContours(table_mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

boxes = []
for c in contours:
    x, y, w, h = cv2.boundingRect(c)
    w_ratio = w / w_img
    h_ratio = h / h_img
    
    # Relaxed constraints
    w_ok = w_img * 0.12 < w < w_img * 0.4
    h_ok = h_img * 0.03 < h < h_img * 0.15
    if w_ok and h_ok:
        boxes.append((x, y, w, h))

print(f"Detected {len(boxes)} boxes under new constraints.")

# Group and sort boxes row-wise to see if we get the correct order and count
boxes = sorted(boxes, key=lambda b: b[1])
sorted_boxes = []
row_group = []
current_y = boxes[0][1] if boxes else 0
expected_h = (max([b[3] for b in boxes]) if boxes else 100)

for b in boxes:
    if abs(b[1] - current_y) < expected_h / 2:
        row_group.append(b)
    else:
        row_group = sorted(row_group, key=lambda r: r[0])
        sorted_boxes.extend(row_group)
        row_group = [b]
        current_y = b[1]
        
if row_group:
    row_group = sorted(row_group, key=lambda r: r[0])
    sorted_boxes.extend(row_group)

print(f"Sorted boxes count: {len(sorted_boxes)}")
for i, b in enumerate(sorted_boxes):
    print(f"Box {i}: x={b[0]}, y={b[1]}, w={b[2]}, h={b[3]}")
