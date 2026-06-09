import cv2
from surya.inference import SuryaInferenceManager
from surya.recognition import RecognitionPredictor
from PIL import Image

img = cv2.imread('temp_pages/page_3.jpg')
if img is None:
    print("Failed to load page image")
    exit(1)

manager = SuryaInferenceManager()
rec_predictor = RecognitionPredictor(manager)

def get_ocr_text(crop):
    crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(crop_rgb)
    results = rec_predictor([pil_img], full_page=True)
    text = ""
    for block in results[0].blocks:
        if hasattr(block, 'text') and block.text:
            text += block.text + "\n"
        elif hasattr(block, 'html') and block.html:
            text += block.html + "\n"
    return text.strip()

# Box 3: y=561, w=669, h=142
crop_3 = img[561:561+142, 624:624+669]
print("--- Box 3 OCR ---")
print(get_ocr_text(crop_3))

# Box 4: y=705, w=669, h=142
crop_4 = img[705:705+142, 624:624+669]
print("--- Box 4 OCR ---")
print(get_ocr_text(crop_4))

# Box 9: y=849, w=669, h=142
crop_9 = img[849:849+142, 624:624+669]
print("--- Box 9 OCR ---")
print(get_ocr_text(crop_9))
