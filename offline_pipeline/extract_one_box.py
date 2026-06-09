import cv2
from surya.inference import SuryaInferenceManager
from surya.recognition import RecognitionPredictor
from PIL import Image

img = cv2.imread('temp_pages/page_3.jpg')
if img is None:
    print("Failed to load page image")
    exit(1)

# Crop Box 3: x=624, y=561, w=669, h=142
crop = img[561:561+142, 624:624+669]
cv2.imwrite('debug_out/crop_box_3.jpg', crop)
print("Saved crop_box_3.jpg to debug_out/")

# Crop Box 0: x=624, y=151, w=669, h=333
crop_0 = img[151:151+333, 624:624+669]
cv2.imwrite('debug_out/crop_box_0.jpg', crop_0)
print("Saved crop_box_0.jpg to debug_out/")

# Let's run Surya OCR on Box 3
manager = SuryaInferenceManager()
rec_predictor = RecognitionPredictor(manager)

crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
pil_img = Image.fromarray(crop_rgb)
results = rec_predictor([pil_img], full_page=True)

print("--- OCR TEXT FOR BOX 3 ---")
for block in results[0].blocks:
    if hasattr(block, 'text') and block.text:
        print(block.text)
    elif hasattr(block, 'html') and block.html:
        print(block.html)
