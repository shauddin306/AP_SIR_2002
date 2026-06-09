import cv2
import numpy as np

img = cv2.imread('temp_pages/page_3.jpg')
if img is None:
    print("Failed to load image")
    exit(1)

h, w = img.shape[:2]
# Calculate percentage of non-white pixels
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
white_pixels = np.sum(gray > 240)
total_pixels = w * h
white_pct = (white_pixels / total_pixels) * 100
print(f"Image dimensions: {w}x{h}")
print(f"White pixels (>240): {white_pixels} / {total_pixels} ({white_pct:.2f}%)")
print(f"Mean pixel value: {np.mean(gray):.2f}")
print(f"Std dev of pixel values: {np.std(gray):.2f}")

# Find if there are any dark shapes
contours, _ = cv2.findContours(cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)[1], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
print(f"Contours found in basic threshold: {len(contours)}")
