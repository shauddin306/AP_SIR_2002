import os
import sys
import subprocess
import json
import requests
import re
from pdf2image import convert_from_path, pdfinfo_from_path
from bs4 import BeautifulSoup
from rapidfuzz import fuzz
from dotenv import load_dotenv
from supabase import create_client, Client

def clean_telugu_ocr_errors(text: str) -> str:
    if not text:
        return text
    # Replace pek / peka / pek? / peka? with Shaik (షేక్)
    text = re.sub(r'పే[కక్]\??', 'షేక్', text)
    # Replace paran / paran? / patan / pattan with Pathan (పఠాన్)
    text = re.sub(r'పరాన్\??', 'పఠాన్', text)
    text = re.sub(r'పటాన్\??', 'పఠాన్', text)
    text = re.sub(r'పట్టాన్\??', 'పఠాన్', text)
    return text

def normalize_house_no(h):
    if not h:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', str(h)).lower()


# Load environment variables
load_dotenv('../.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials in .env.local")
    sys.exit(1)

supabase: Client = create_client(url, key)

# Admin ID for API logs (the ID of your Super Admin account)
ADMIN_ID = "7b999a5e-a7cb-4cf4-8e68-1f47a9490592" 
PROGRESS_FILE = "qc_auto_progress.json"

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_progress(progress):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=4)

def get_pdf_for_part(assembly_no, part_no):
    print(f"Searching for Assembly {assembly_no}, Part {part_no} in 'voter-pdfs' bucket...")
    prefix = f"{assembly_no}_{part_no}_"
    files = supabase.storage.from_('voter-pdfs').list(path='', options={'search': prefix})
    matches = [f['name'] for f in files if f['name'].startswith(prefix) and f['name'].endswith('.pdf')]
    if not matches:
        return None
    matches.sort(reverse=True)
    return matches[0]

def download_pdf(filename):
    if os.path.exists(filename):
        print(f"File {filename} already exists locally.")
        return filename
    print(f"Downloading {filename}...")
    res = supabase.storage.from_('voter-pdfs').download(filename)
    with open(filename, 'wb') as f:
        f.write(res)
    print("Download complete.")
    return filename

def convert_pdf_to_images(pdf_path, output_folder):
    os.makedirs(output_folder, exist_ok=True)
    info = pdfinfo_from_path(pdf_path)
    max_pages = info["Pages"]
    print(f"PDF has {max_pages} pages.")
    for i in range(3, max_pages + 1):
        img_path = os.path.join(output_folder, f"page_{i}.jpg")
        if not os.path.exists(img_path):
            pages = convert_from_path(pdf_path, dpi=150, first_page=i, last_page=i)
            if pages:
                pages[0].save(img_path, "JPEG")
    return max_pages

def process_page(image_path, page_num, pdf_filename):
    print(f"\n--- Processing Page {page_num} ---")
    print(f"Running Surya OCR on {image_path}...")
    subprocess.run(
        ["venv/bin/surya_ocr", image_path],
        capture_output=True,
        text=True
    )
    
    image_name = os.path.splitext(os.path.basename(image_path))[0]
    results_dir = "results/surya"
    json_path = os.path.join(results_dir, image_name, "results.json")
    
    if not os.path.exists(json_path):
        print("Surya OCR failed to generate JSON.")
        return []
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    try:
        page_data = data[image_name][0]
        html_content = ""
        for block in page_data.get('blocks', []):
            if 'html' in block:
                html_content += block['html']
    except Exception as e:
        print(f"Failed to parse Surya JSON: {e}")
        return []
        
    if not html_content:
        print("No HTML table found on this page.")
        return []
        
    soup = BeautifulSoup(html_content, 'html.parser')
    extracted_voters = []
    
    rows = soup.find_all('tr')
    row_idx = 0
    for tr in rows:
        cols = tr.find_all(['td', 'th'])
        cols_text = [c.get_text(strip=True) for c in cols]
        
        # Skip header rows
        if not cols_text or not cols_text[0].isdigit():
            continue
            
        serial_no = int(cols_text[0])
        house_no = cols_text[1] if len(cols_text) > 1 else ""
        voter_name = clean_telugu_ocr_errors(cols_text[2]) if len(cols_text) > 2 else ""
        relative_name = clean_telugu_ocr_errors(cols_text[4]) if len(cols_text) > 4 else ""
        epic_id = cols_text[7] if len(cols_text) > 7 else ""
        
        row_idx += 1
        extracted_voters.append({
            'page_relative_serial': row_idx,
            'ocr_voter_name_telugu': voter_name,
            'ocr_relative_name_telugu': relative_name,
            'epic_id': epic_id,
            'house_no': house_no,
            'source_pdf': pdf_filename,
            'page_no': page_num
        })
        
    print(f"Extracted {len(extracted_voters)} valid voter rows from page {page_num}.")
    return extracted_voters

def is_placeholder_epic(epic) -> bool:
    if not epic:
        return True
    epic = str(epic).strip()
    if epic.startswith('NO_EPIC_'):
        return True
    # If it ends with 6 or more zeros, e.g. AP221520000000
    if re.search(r'0{6,}$', epic):
        return True
    return False

def house_numbers_mismatch(h1, h2) -> bool:
    norm1 = normalize_house_no(h1)
    norm2 = normalize_house_no(h2)
    if not norm1 or not norm2:
        return False
    return norm1 != norm2

def epic_ids_mismatch(e1, e2) -> bool:
    if is_placeholder_epic(e1) or is_placeholder_epic(e2):
        return False
    return e1.strip() != e2.strip()

def auto_correct_and_queue(extracted_voters, assembly_no, part_no, page_num):
    if not extracted_voters:
        return
        
    print(f"Fetching database records for Assembly {assembly_no} Part {part_no} Page {page_num}...")
    
    res = supabase.table('voters').select('id, serial_no, epic_id, house_no, voter_name_english, voter_name_telugu, relative_name_english, relative_name_telugu') \
        .eq('assembly_no', assembly_no) \
        .eq('part_no', part_no) \
        .eq('page_no', page_num) \
        .order('serial_no').execute()
        
    db_records = res.data
    if not db_records:
        print(f"No database records found for page {page_num}. Skipping comparison.")
        return
        
    print(f"Comparing {len(extracted_voters)} OCR boxes with {len(db_records)} DB records...")
    
    unmatched_ocr = list(extracted_voters)
    unmatched_db = list(db_records)
    
    for idx, db_v in enumerate(unmatched_db):
        db_v['_idx'] = idx

    matches = {}
    
    # Phase 1: Match by EPIC ID (only if not a placeholder)
    for ocr_v in list(unmatched_ocr):
        ocr_epic = ocr_v.get('epic_id')
        if ocr_epic and not is_placeholder_epic(ocr_epic):
            for db_v in list(unmatched_db):
                if db_v.get('epic_id') == ocr_epic:
                    matches[ocr_v['page_relative_serial']] = db_v
                    unmatched_ocr.remove(ocr_v)
                    unmatched_db.remove(db_v)
                    break
                    
    # Phase 2: Match by House No AND Page Relative Index
    for ocr_v in list(unmatched_ocr):
        norm_ocr_h = normalize_house_no(ocr_v.get('house_no'))
        if norm_ocr_h:
            for db_v in list(unmatched_db):
                db_rel_idx = db_v['_idx'] + 1
                if db_rel_idx == ocr_v['page_relative_serial'] and normalize_house_no(db_v.get('house_no')) == norm_ocr_h:
                    if epic_ids_mismatch(ocr_v.get('epic_id'), db_v.get('epic_id')):
                        continue
                    matches[ocr_v['page_relative_serial']] = db_v
                    unmatched_ocr.remove(ocr_v)
                    unmatched_db.remove(db_v)
                    break
                    
    # Phase 3: Match by House No only (nearest index on the same page with name checks)
    for ocr_v in list(unmatched_ocr):
        norm_ocr_h = normalize_house_no(ocr_v.get('house_no'))
        if norm_ocr_h:
            best_db = None
            best_dist = 999
            for db_v in unmatched_db:
                if normalize_house_no(db_v.get('house_no')) == norm_ocr_h:
                    if epic_ids_mismatch(ocr_v.get('epic_id'), db_v.get('epic_id')):
                        continue
                    # Check name similarity for sanity - must not be completely different names
                    name_sim = fuzz.ratio(db_v.get('voter_name_telugu') or '', ocr_v.get('ocr_voter_name_telugu') or '')
                    rel_sim = fuzz.ratio(db_v.get('relative_name_telugu') or '', ocr_v.get('ocr_relative_name_telugu') or '')
                    if name_sim < 30 and rel_sim < 30:
                        continue
                    dist = abs((db_v['_idx'] + 1) - ocr_v['page_relative_serial'])
                    if dist < best_dist:
                        best_dist = dist
                        best_db = db_v
            if best_db:
                matches[ocr_v['page_relative_serial']] = best_db
                unmatched_ocr.remove(ocr_v)
                unmatched_db.remove(best_db)
                
    # Phase 4: Match by Page-Relative Index only (strict checking)
    for ocr_v in list(unmatched_ocr):
        for db_v in list(unmatched_db):
            db_rel_idx = db_v['_idx'] + 1
            if db_rel_idx == ocr_v['page_relative_serial']:
                # 1. EPIC ID must not mismatch
                if epic_ids_mismatch(ocr_v.get('epic_id'), db_v.get('epic_id')):
                    continue
                # 2. House number must not mismatch
                if house_numbers_mismatch(ocr_v.get('house_no'), db_v.get('house_no')):
                    continue
                # 3. Name similarity check - must not be completely different people
                name_sim = fuzz.ratio(db_v.get('voter_name_telugu') or '', ocr_v.get('ocr_voter_name_telugu') or '')
                rel_sim = fuzz.ratio(db_v.get('relative_name_telugu') or '', ocr_v.get('ocr_relative_name_telugu') or '')
                if name_sim < 30 and rel_sim < 30:
                    continue
                matches[ocr_v['page_relative_serial']] = db_v
                unmatched_ocr.remove(ocr_v)
                unmatched_db.remove(db_v)
                break
                
    # Process matched pairs for discrepancy detection
    for ocr_v in extracted_voters:
        db_v = matches.get(ocr_v['page_relative_serial'])
        if not db_v:
            continue
            
        db_name = db_v.get('voter_name_telugu') or ''
        db_rel = db_v.get('relative_name_telugu') or ''
        
        ocr_name = ocr_v['ocr_voter_name_telugu'] or ''
        ocr_rel = ocr_v['ocr_relative_name_telugu'] or ''
        
        name_score = fuzz.ratio(db_name, ocr_name) if db_name and ocr_name else 0
        rel_score = fuzz.ratio(db_rel, ocr_rel) if db_rel and ocr_rel else 0
        
        needs_name_update = 50 < name_score < 90
        needs_rel_update = 50 < rel_score < 90
        
        if needs_name_update or needs_rel_update:
            print(f"Fixing! DB: '{db_name}' / '{db_rel}' -> OCR: '{ocr_name}' / '{ocr_rel}' (Scores: Name={name_score}%, Rel={rel_score}%)")
            
            # 1. Save Backup
            backup_file = f"qc_backups_part_{part_no}.json"
            backups = []
            if os.path.exists(backup_file):
                with open(backup_file, 'r') as f:
                    backups = json.load(f)
                    
            backups.append({
                "voter_id": db_v["id"],
                "original_voter_name_telugu": db_name,
                "original_relative_name_telugu": db_rel,
                "new_voter_name_telugu": ocr_name if ocr_name else db_name,
                "new_relative_name_telugu": ocr_rel if ocr_rel else db_rel,
                "page_no": page_num,
                "serial_no": db_v.get("serial_no")
            })
            
            with open(backup_file, 'w') as f:
                json.dump(backups, f, indent=4)
                
            # 2. Update Database Directly
            update_data = {}
            if ocr_name:
                update_data["voter_name_telugu"] = ocr_name
            if ocr_rel:
                update_data["relative_name_telugu"] = ocr_rel
                
            try:
                update_res = supabase.table('voters').update(update_data).eq('id', db_v['id']).execute()
                
                if update_res.data:
                    print(f" -> Auto-approved serial {db_v['serial_no']} in DB successfully.")
                else:
                    print(f" -> Failed to update serial {db_v['serial_no']} in DB.")
            except Exception as e:
                print(f" -> Error updating serial {db_v['serial_no']} in DB: {e}")

def process_part(assembly_no, part_no, progress):
    part_key = f"{assembly_no}_{part_no}"
    if part_key in progress and progress[part_key].get('status') == 'completed':
        print(f"Skipping Assembly {assembly_no} Part {part_no} (Already Completed)")
        return
        
    if part_key not in progress:
        progress[part_key] = {'status': 'in_progress', 'pages_completed': []}
        
    pdf_filename = get_pdf_for_part(assembly_no, part_no)
    if not pdf_filename:
        print(f"Error: No PDF found in storage for Assembly {assembly_no}, Part {part_no}")
        progress[part_key]['status'] = 'no_pdf_found'
        save_progress(progress)
        return
        
    download_pdf(pdf_filename)
    
    output_folder = os.path.join("temp_pages", f"{assembly_no}_{part_no}")
    total_pages = convert_pdf_to_images(pdf_filename, output_folder)
    
    # Process from page 3 to avoid summary pages
    for page_num in range(3, total_pages + 1):
        if page_num in progress[part_key]['pages_completed']:
            print(f"Skipping Page {page_num} (Already Completed)")
            continue
            
        img_path = os.path.join(output_folder, f"page_{page_num}.jpg")
        if not os.path.exists(img_path):
            continue
            
        extracted = process_page(img_path, page_num, pdf_filename)
        auto_correct_and_queue(extracted, assembly_no, part_no, page_num)
        
        progress[part_key]['pages_completed'].append(page_num)
        save_progress(progress)
        
    progress[part_key]['status'] = 'completed'
    save_progress(progress)
    print(f"========== Completed Assembly {assembly_no} Part {part_no} ==========\n")

def main():
    assembly_no = 152
    start_part = 76
    end_part = 250
    
    print(f"Starting Fully Automated QC Pipeline for Assembly {assembly_no}, Parts {start_part} to {end_part}")
    progress = load_progress()
    
    for part_no in range(start_part, end_part + 1):
        process_part(assembly_no, part_no, progress)

if __name__ == "__main__":
    main()
