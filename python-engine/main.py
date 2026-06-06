import base64
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
import re

# New Surya 0.20 API
from surya.inference import SuryaInferenceManager
from surya.recognition import RecognitionPredictor

print("Loading Surya OCR AI Models... (this takes a moment and ~2.5GB RAM)")
manager = SuryaInferenceManager()
rec_predictor = RecognitionPredictor(manager)
print("Surya AI Models Loaded!")

app = FastAPI(title="Voter OCR Python Engine")

class ExtractRequest(BaseModel):
    image_base64: str
    page_no: int

def extract_voter_boxes(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 10
    )

    # Dynamically scale kernels based on image size! (A line must be at least 1/15th of page width)
    h_img, w_img = img.shape[:2]
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w_img // 15, 1))
    detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h_img // 30))
    detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    
    table_mask = cv2.add(detect_horizontal, detect_vertical)
    
    # Save debug images for the first page
    cv2.imwrite("debug_input.jpg", img)
    cv2.imwrite("debug_mask.jpg", table_mask)
    
    # Use RETR_LIST to find ALL contours (including the 30 internal voter boxes), 
    # not just the single giant external table border!
    contours, _ = cv2.findContours(table_mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    h_img, w_img = img.shape[:2]
    print(f"DEBUG: Found {len(contours)} contours on image size {w_img}x{h_img}")
    
    boxes = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        
        # A voter box is roughly 1/3 of the page width and 1/10 of the height
        # ECI PDFs have headers, so we relax the height constraint significantly.
        if (w_img * 0.25 < w < w_img * 0.4) and (h_img * 0.05 < h < h_img * 0.15):
            boxes.append((x, y, w, h))
            
    print(f"DEBUG: Filtered down to {len(boxes)} boxes.")
            
    boxes = sorted(boxes, key=lambda b: b[1])
    
    sorted_boxes = []
    row_group = []
    current_y = boxes[0][1] if boxes else 0
    
    # Need to define expected_h for grouping logic
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
        
    cropped_images = []
    for (x, y, w, h) in sorted_boxes:
        crop = img[y:y+h, x:x+w]
        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(crop_rgb)
        cropped_images.append(pil_img)
        
    return cropped_images

def parse_surya_text(text: str):
    voter_data = {
        "voter_name": "",
        "relative_name": "",
        "house_no": "",
        "age": 0,
        "gender": "",
        "epic_no": ""
    }
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    for line in lines:
        epic_match = re.search(r'[A-Z]{2,3}[0-9]{5,8}', line)
        if epic_match:
            voter_data["epic_no"] = epic_match.group(0)
            
    for line in lines:
        if 'వయస్సు' in line or 'Age' in line:
            age_match = re.search(r'(\d{2})', line)
            if age_match:
                voter_data["age"] = int(age_match.group(1))
        
        if 'పు' in line or 'స్త్రీ' in line or 'Male' in line or 'Female' in line:
            if 'పు' in line or 'Male' in line:
                voter_data["gender"] = "Male"
            elif 'స్త్రీ' in line or 'Female' in line:
                voter_data["gender"] = "Female"
                
    if len(lines) > 2:
        voter_data["voter_name"] = lines[1]
        voter_data["relative_name"] = lines[2]
        
    return voter_data


@app.post("/extract")
async def extract_voters(req: ExtractRequest):
    try:
        img_data = base64.b64decode(req.image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        box_images = extract_voter_boxes(img)
        
        if not box_images:
            return {"voters": [], "raw_text": "No grid found on page"}

        # Surya 0.20 batch processing. Treat each box as a full page.
        page_results = rec_predictor(box_images, full_page=True)

        voters = []
        
        for idx, page in enumerate(page_results):
            # page is a PageOCRResult which has blocks (BlockOCRResult)
            lines_text = [block.text for block in page.blocks if hasattr(block, 'text')]
            # if the new API uses HTML, we might need to parse block.html
            # Let's extract text out of the blocks (Surya 0.20 returns raw text in block.text if it exists, or block.html)
            # Actually, the simplest is to iterate the raw string if available, or parse html
            
            box_text = ""
            for b in page.blocks:
                # Some versions put text in .text, others in .html or we just rely on parsing it
                if hasattr(b, 'text') and b.text:
                    box_text += b.text + "\n"
                elif hasattr(b, 'html') and b.html:
                    # Strip basic HTML tags
                    box_text += re.sub('<[^<]+?>', '', b.html) + "\n"

            parsed = parse_surya_text(box_text)
            
            # Print exactly what Surya saw for debugging!
            print(f"--- BOX {idx} ---")
            print(box_text)
            print("-----------------")
            
            # Force append the voter matching ExtractedVoter interface
            voters.append({
                "serial_no": idx + 1,
                "voter_name_telugu": parsed.get('voter_name', '') or f"Unknown {idx}",
                "voter_name_english": "",
                "relative_name_telugu": parsed.get('relative_name', ''),
                "relative_name_english": "",
                "relation_type": "తం",
                "house_no": parsed.get('house_no', ''),
                "age": parsed.get('age', 0),
                "gender": parsed.get('gender', ''),
                "epic_id": parsed.get('epic_no', '') or f"NO_EPIC_{idx}",
                "page_no": req.page_no,
                "confidence": "medium"
            })

        return {
            "voters": voters,
            "raw_text": f"Processed {len(box_images)} boxes."
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
