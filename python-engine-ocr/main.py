import base64
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
import re
import os
import subprocess
import tempfile
from bs4 import BeautifulSoup

# NOTE: Surya imports are DEFERRED inside get_models() below.
# Do NOT import them at the top level — PyTorch initialization takes 15-30s,
# which causes Railway to kill the container before Uvicorn can bind to the port.

# Lazy-loaded model references
manager = None
rec_predictor = None

def get_models():
    global manager, rec_predictor
    if manager is None:
        print("[startup] Importing Surya OCR library...")
        # Defer heavy imports here so they don't block server startup
        from surya.inference import SuryaInferenceManager
        from surya.recognition import RecognitionPredictor
        print("[startup] Loading Surya OCR AI Models into RAM (~2.5GB)...")
        manager = SuryaInferenceManager()
        rec_predictor = RecognitionPredictor(manager)
        print("[startup] Surya AI Models Loaded and ready!")
    return manager, rec_predictor

app = FastAPI(title="Voter OCR Python Engine")

@app.get("/")
def health_check():
    """Instant health check — no model loading required."""
    return {"status": "ok", "service": "Voter OCR Python Engine"}

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
        if (w_img * 0.20 < w < w_img * 0.45) and (h_img * 0.03 < h < h_img * 0.25):
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

def _is_valid_name_candidate(text: str, epic_no: str) -> bool:
    """Returns False if the text is clearly NOT a name (is an ID, number, house no, etc.)"""
    if not text or len(text) < 2:
        return False
    # Reject if it looks like an EPIC ID (2-3 uppercase letters + 5-8 digits)
    if re.match(r'^[A-Z]{2,3}\d{5,8}$', text):
        return False
    # Reject if it matches the extracted EPIC ID
    if epic_no and text.strip() == epic_no:
        return False
    # Reject if purely numeric
    if re.match(r'^\d+$', text):
        return False
    # Reject if it looks like a house number pattern (e.g. 44-3A, 12/B)
    if re.match(r'^\d+[\-\/]\d*[A-Za-z]?$', text):
        return False
    # Reject if only punctuation / special chars (no Telugu or Latin letters)
    if not re.search(r'[a-zA-Z\u0C00-\u0C7F]', text):
        return False
    return True


def clean_telugu_ocr_errors(text: str) -> str:
    if not text:
        return text
    # Replace pek / peka / pek? / peka? / paka / pak? with Shaik (షేక్)
    text = re.sub(r'[పపేపె][కక్]\??', 'షేక్', text)
    # Replace paran / paran? / patan / pattan with Pathan (పఠాన్)
    text = re.sub(r'పరాన్\??', 'పఠాన్', text)
    text = re.sub(r'పటాన్\??', 'పఠాన్', text)
    text = re.sub(r'పట్టాన్\??', 'పఠాన్', text)
    # Remove stray question marks which often appear from OCR instead of spaces or ends of words
    text = text.replace('?', ' ').strip()
    # Collapse multiple spaces into one
    text = re.sub(r'\s+', ' ', text)
    return text


def parse_surya_text(text: str):
    """
    Parse OCR text from a single voter box into structured fields.
    Uses Telugu field LABELS (పేరు:, తండ్రి పేరు:, etc.) to locate names,
    falling back to positional logic only as a last resort with sanity checks.
    """
    voter_data = {
        "voter_name": "",
        "relative_name": "",
        "house_no": "",
        "age": 0,
        "gender": "",
        "epic_no": "",
        "_found_by_label": False,  # internal flag for confidence scoring
    }
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # ── 1. EPIC ID: most structurally unique, extract first ──────────────────
    for line in lines:
        epic_match = re.search(r'[A-Z]{2,3}[0-9]{5,8}', line)
        if epic_match:
            voter_data["epic_no"] = epic_match.group(0)
            break

    # ── 2. Age: look for label + 2-digit number ──────────────────────────────
    AGE_LABELS = ['వయస్సు', 'వయసు', 'Age', 'age']
    for line in lines:
        if any(lbl in line for lbl in AGE_LABELS):
            age_match = re.search(r'\b(\d{2})\b', line)
            if age_match:
                voter_data["age"] = int(age_match.group(1))
            break

    # ── 3. Gender: label-based ───────────────────────────────────────────────
    GENDER_LABELS = ['లింగం', 'Gender', 'gender']
    for line in lines:
        if any(lbl in line for lbl in GENDER_LABELS):
            if any(w in line for w in ['పురుషుడు', 'Male', 'పు']):
                voter_data["gender"] = "Male"
            elif any(w in line for w in ['స్త్రీ', 'Female', 'మ']):
                voter_data["gender"] = "Female"
            break
        # Also catch gender without label (common in Surya output)
        if 'పురుషుడు' in line or 'Male' in line:
            voter_data["gender"] = "Male"
        elif 'స్త్రీ' in line or 'Female' in line:
            voter_data["gender"] = "Female"

    # ── 4. House Number: look for label or numeric-dash pattern ──────────────
    HOUSE_LABELS = ['గృహ సంఖ్య', 'గృహసంఖ్య', 'House', 'house', 'ఇల్లు', 'ఇంటి సంఖ్య']
    for line in lines:
        if any(lbl in line for lbl in HOUSE_LABELS):
            after = line.split(':', 1)[-1].strip()
            if after:
                voter_data["house_no"] = after
            break
        elif re.match(r'^\d+[\-\/]\d', line):
            voter_data["house_no"] = line

    # ── 5. Voter Name: look for పేరు: label ──────────────────────────────────
    VOTER_NAME_LABELS = ['పేరు', 'Name', 'name']
    RELATIVE_LABELS = ['తండ్రి పేరు', 'భర్త పేరు', 'తల్లి పేరు', 'తండ్రి', 'భర్త', 'తల్లి', 'Relative']
    
    # To avoid matching relative-name labels when looking for voter name:
    # only match a line that has a voter-name label but NOT a relative-name label
    for i, line in enumerate(lines):
        has_voter_label = any(lbl in line for lbl in VOTER_NAME_LABELS)
        has_rel_label = any(lbl in line for lbl in RELATIVE_LABELS)
        if has_voter_label and not has_rel_label:
            after = line.split(':', 1)[-1].strip()
            if after and _is_valid_name_candidate(after, voter_data["epic_no"]):
                voter_data["voter_name"] = after
                voter_data["_found_by_label"] = True
            elif i + 1 < len(lines):
                candidate = lines[i + 1]
                if _is_valid_name_candidate(candidate, voter_data["epic_no"]):
                    voter_data["voter_name"] = candidate
                    voter_data["_found_by_label"] = True
            break

    # ── 6. Relative Name: look for తండ్రి/భర్త/తల్లి label ──────────────────
    for i, line in enumerate(lines):
        if any(lbl in line for lbl in RELATIVE_LABELS):
            after = line.split(':', 1)[-1].strip()
            if after and _is_valid_name_candidate(after, voter_data["epic_no"]):
                voter_data["relative_name"] = after
            elif i + 1 < len(lines):
                candidate = lines[i + 1]
                if _is_valid_name_candidate(candidate, voter_data["epic_no"]):
                    voter_data["relative_name"] = candidate
            break

    # ── 7. Fallback: positional (ONLY if label-based search failed) ───────────
    # We are very conservative here: skip any line that fails the name sanity check
    if not voter_data["voter_name"] and len(lines) > 1:
        print(f"WARN: No label found for voter name. Attempting positional fallback.")
        for candidate in lines[1:4]:  # check lines 2-4 (not line 0 which is serial/header)
            if _is_valid_name_candidate(candidate, voter_data["epic_no"]):
                voter_data["voter_name"] = candidate
                break

    if not voter_data["relative_name"] and voter_data["voter_name"] and len(lines) > 2:
        start_idx = lines.index(voter_data["voter_name"]) + 1 if voter_data["voter_name"] in lines else 3
        for candidate in lines[start_idx:start_idx + 2]:
            if (_is_valid_name_candidate(candidate, voter_data["epic_no"])
                    and candidate != voter_data["voter_name"]):
                voter_data["relative_name"] = candidate
                break

    # Apply spelling corrections
    voter_data["voter_name"] = clean_telugu_ocr_errors(voter_data["voter_name"])
    voter_data["relative_name"] = clean_telugu_ocr_errors(voter_data["relative_name"])

    return voter_data


def _normalize_serial(raw: str) -> int:
    """
    Robustly convert an OCR serial cell to an integer.
    Handles common OCR noise: '|', '.', ',', 'l'→'1', 'O'→'0', stray spaces.
    Returns -1 if it cannot be parsed as a positive integer.
    """
    if not raw:
        return -1
    cleaned = (raw.strip()
               .replace('|', '').replace('.', '').replace(',', '')
               .replace('l', '1').replace('O', '0').replace('o', '0')
               .replace(' ', '').replace('\t', ''))
    # Keep only leading digits
    m = re.match(r'^(\d+)', cleaned)
    if m:
        val = int(m.group(1))
        return val if val > 0 else -1
    return -1


def extract_voters_row_table(img, page_no: int) -> list:
    """
    Handles row-table format PDFs (like Part 189 — spreadsheet with 8 columns, one voter per row).
    
    Layout columns:
      (1) Serial No | (2) House No | (3) Voter Name | (4) Relation Type | 
      (5) Relative Name | (6) Gender (Sri/Pu) | (7) Age | (8) EPIC ID
    
    Uses the already-loaded Surya rec_predictor (full-page OCR) → parse HTML table rows.
    This is FAST since models are already in memory.
    """
    try:
        # Convert OpenCV BGR image to PIL RGB for Surya
        pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        
        # Run full-page OCR with already-loaded models (fast, no model reload needed)
        print(f"Row-table: running full-page Surya OCR on page {page_no}...")
        _, rec_predictor = get_models()
        page_results = rec_predictor([pil_img], full_page=True)
        
        if not page_results:
            print("Row-table: no OCR results returned")
            return []
        
        # Collect all HTML from blocks
        html_content = ""
        for block in page_results[0].blocks:
            if hasattr(block, 'html') and block.html:
                html_content += block.html
            elif hasattr(block, 'text') and block.text:
                # Wrap plain text in a table row for parsing if it contains a table
                html_content += block.text + "\n"
        
        if not html_content:
            print("Row-table fallback: no HTML content from surya_ocr")
            return []
            
        print(f"Row-table: got {len(html_content)} chars of HTML from Surya")
        
        # Parse HTML table rows
        soup = BeautifulSoup(html_content, 'html.parser')
        voters = []
        row_idx = 0
        
        for tr in soup.find_all('tr'):
            cols = tr.find_all(['td', 'th'])
            cols_text = [c.get_text(strip=True) for c in cols]
            
            # Skip header rows — first column must be a number
            serial_no = _normalize_serial(cols_text[0] if cols_text else "")
            if serial_no < 1:
                continue

            house_no = cols_text[1] if len(cols_text) > 1 else ""
            voter_name = clean_telugu_ocr_errors(cols_text[2]) if len(cols_text) > 2 else ""
            relation_type = cols_text[3] if len(cols_text) > 3 else ""
            relative_name = clean_telugu_ocr_errors(cols_text[4]) if len(cols_text) > 4 else ""
            gender_raw = cols_text[5] if len(cols_text) > 5 else ""
            age_raw = cols_text[6] if len(cols_text) > 6 else "0"
            epic_id = cols_text[7] if len(cols_text) > 7 else ""
            
            # Normalize gender: "స్త్రీ"/"స్"/"స" = Female, "పు"/"పురుషుడు" = Male
            if any(g in gender_raw for g in ['స్త్రీ', 'స్', 'స్ర', 'మ']):
                gender = 'Female'
            elif any(g in gender_raw for g in ['పు', 'పురుషుడు', 'పు.']):
                gender = 'Male'
            else:
                gender = gender_raw
            
            # Parse age
            try:
                age = int(re.search(r'\d+', age_raw).group()) if re.search(r'\d+', age_raw) else 0
            except:
                age = 0
            
            # Validate EPIC ID
            epic_match = re.search(r'[A-Z]{2,3}\d{5,15}', epic_id)
            epic_clean = epic_match.group(0) if epic_match else (f"NO_EPIC_{serial_no}" if not epic_id else epic_id)
            
            row_idx += 1
            confidence = 'high' if (voter_name and epic_match) else ('medium' if voter_name else 'low')
            
            voters.append({
                "serial_no": serial_no,
                "voter_name_telugu": voter_name or None,
                "voter_name_english": "",
                "relative_name_telugu": relative_name or None,
                "relative_name_english": "",
                "relation_type": relation_type or "తం",
                "house_no": house_no or None,
                "age": age,
                "gender": gender,
                "epic_id": epic_clean,
                "page_no": page_no,
                "confidence": confidence,
            })
            
            print(f"  Row {serial_no}: '{voter_name}' / '{relative_name}' | house={house_no} | epic={epic_clean}")
        
        print(f"Row-table extraction complete: {len(voters)} voters from page {page_no}")
        return voters
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Row-table fallback exception: {e}")
        return []


@app.post("/extract")

def extract_voters(req: ExtractRequest):
    try:
        img_data = base64.b64decode(req.image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        box_images = extract_voter_boxes(img)
        
        if not box_images:
            # ── FALLBACK: Row-table format (like Part 189) ─────────────────
            # This PDF uses a spreadsheet-style table (8 cols, 1 row per voter)
            # instead of individual voter boxes. Use surya_ocr CLI → parse HTML rows.
            print(f"Box detection found 0 boxes. Attempting row-table fallback (surya_ocr CLI)...")
            voters = extract_voters_row_table(img, req.page_no)
            if voters:
                return {"voters": voters, "raw_text": f"Row-table mode: extracted {len(voters)} voters."}
            return {"voters": [], "raw_text": "No grid found on page"}

        # Surya 0.20 batch processing. Treat each box as a full page.
        # CRITICAL FIX: Chunk this into smaller batches to prevent OOM! 
        # Sending 30 images requires >8GB RAM (crashes). Sending 4 is too slow (>100s timeout).
        # 8 is the mathematical sweet spot to use ~4GB RAM and finish in ~60 seconds.
        page_results = []
        batch_size = 8
        _, rec_predictor = get_models()
        for i in range(0, len(box_images), batch_size):
            chunk = box_images[i:i+batch_size]
            chunk_results = rec_predictor(chunk, full_page=True)
            page_results.extend(chunk_results)

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
            print(f"    → name='{parsed.get('voter_name','')}' rel='{parsed.get('relative_name','')}' epic='{parsed.get('epic_no','')}' by_label={parsed.get('_found_by_label')}")
            print("-----------------")

            # Compute real confidence based on what was found
            found_epic = bool(re.match(r'^[A-Z]{2,3}\d{5,8}$', parsed.get('epic_no', '')))
            found_by_label = parsed.get('_found_by_label', False)
            found_age_valid = 18 <= parsed.get('age', 0) <= 100
            found_relative = bool(parsed.get('relative_name', ''))
            score = (2 if found_epic else 0) + (2 if found_by_label else 0) + \
                    (1 if found_age_valid else 0) + (1 if found_relative else 0)
            confidence = 'high' if score >= 5 else ('medium' if score >= 3 else 'low')

            # Use None instead of "Unknown idx" so UI/downstream knows name is truly missing
            voter_name = parsed.get('voter_name', '').strip() or None

            # Force append the voter matching ExtractedVoter interface
            voters.append({
                "serial_no": idx + 1,
                "voter_name_telugu": voter_name,
                "voter_name_english": "",
                "relative_name_telugu": parsed.get('relative_name', '') or None,
                "relative_name_english": "",
                "relation_type": "తం",
                "house_no": parsed.get('house_no', '') or None,
                "age": parsed.get('age', 0),
                "gender": parsed.get('gender', ''),
                "epic_id": parsed.get('epic_no', '') or f"NO_EPIC_{idx}",
                "page_no": req.page_no,
                "confidence": confidence
            })

        return {
            "voters": voters,
            "raw_text": f"Processed {len(box_images)} boxes."
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- Mount Search API routes ---
try:
    from search_api import advanced_indic_search, SearchRequest
    @app.post("/v1/search")
    async def v1_search(req: SearchRequest):
        return await advanced_indic_search(req)
    print("Successfully mounted /v1/search endpoint.")
except Exception as e:
    print(f"Warning: Could not mount search_api routes: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"[startup] Starting Uvicorn on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
