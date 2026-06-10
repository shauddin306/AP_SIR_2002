import sys
import cv2
import numpy as np

def inspect_boxes(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 10
    )
    h_img, w_img = img.shape[:2]
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w_img // 15, 1))
    detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h_img // 30))
    detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    table_mask = cv2.add(detect_horizontal, detect_vertical)
    contours, _ = cv2.findContours(table_mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"Total contours found: {len(contours)}")
    for i, c in enumerate(contours[:10]):
        x, y, w, h = cv2.boundingRect(c)
        print(f"Contour {i}: w_ratio={w/w_img:.4f}, h_ratio={h/h_img:.4f}")
            
img = cv2.imread("temp_pages/152_15/page_3.jpg")
inspect_boxes(img)
