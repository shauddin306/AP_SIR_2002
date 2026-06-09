import cv2
import os

os.makedirs('debug_out', exist_ok=True)

img = cv2.imread('temp_pages/page_3.jpg')
if img is None:
    print("Failed to load temp_pages/page_3.jpg")
    exit(1)

h_img, w_img = img.shape[:2]
print(f"Image dimensions: {w_img}x{h_img}")

gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
# Try both main.py thresholding parameters and prototype.py parameters
for name, block, c in [("main", 21, 10), ("proto", 15, 4)]:
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, block, c
    )
    cv2.imwrite(f'debug_out/thresh_{name}.jpg', thresh)
    
    # Try different kernel sizes
    for k_factor in [15, 30, 40, 80]:
        h_k = w_img // k_factor
        v_k = h_img // (k_factor * 2)
        
        # Absolute sizes
        if k_factor == 40: # mimicking prototype.py absolute sizes of 40x1 and 1x40
            h_k, v_k = 40, 40
            
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_k, 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_k))
        
        det_h = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, h_kernel, iterations=2)
        det_v = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, v_kernel, iterations=2)
        
        mask = cv2.add(det_h, det_v)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        valid = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            # check aspect ratios and sizes
            if (w_img * 0.20 < w < w_img * 0.45) and (h_img * 0.04 < h < h_img * 0.18):
                valid.append((x, y, w, h))
                
        print(f"Thresh: {name}, k_factor: {k_factor} (h_k={h_k}, v_k={v_k}) -> Contours: {len(contours)}, Valid Boxes: {len(valid)}")
        
        # Save a debug image for this combination if it finds boxes
        if len(valid) > 0:
            debug_img = img.copy()
            for x, y, w, h in valid:
                cv2.rectangle(debug_img, (x, y), (x + w, y + h), (0, 255, 0), 3)
            cv2.imwrite(f'debug_out/boxes_{name}_k{k_factor}.jpg', debug_img)
