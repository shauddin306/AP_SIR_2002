import os
import sys
import json
import argparse
import subprocess
from pathlib import Path
from bs4 import BeautifulSoup
from pdf2image import convert_from_path
from rapidfuzz import fuzz
from supabase import create_client, Client
from dotenv import load_dotenv

# Load Supabase credentials
load_dotenv('../.env.local')
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials in .env.local")
    sys.exit(1)

supabase: Client = create_client(url, key)

def get_pdf_for_part(assembly_no, part_no):
    """Finds the latest PDF for a given assembly and part in the Supabase bucket."""
    print(f"Searching for Assembly {assembly_no}, Part {part_no} in 'voter-pdfs' bucket...")
    files = supabase.storage.from_('voter-pdfs').list()
    
    prefix = f"{assembly_no}_{part_no}_"
    matches = [f['name'] for f in files if f['name'].startswith(prefix) and f['name'].endswith('.pdf')]
    
    if not matches:
        return None
    
    # Sort to get the latest if there are multiple
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

def process_page(image_path, page_num, pdf_filename):
    print(f"\n--- Processing Page {page_num} ---")
    
    # 1. Run Surya OCR
    # Surya OCR outputs to 'results/surya/IMAGE_NAME/results.json' by default
    image_name = Path(image_path).stem
    results_dir = Path("results") / "surya" / image_name
    
    print(f"Running Surya OCR on {image_path}...")
    # Suppress output unless error to keep terminal clean
    result = subprocess.run(
        ["surya_ocr", image_path],
        capture_output=True,
        text=True
    )
    
    results_file = results_dir / "results.json"
    if not results_file.exists():
        print(f"Error: Surya OCR failed to produce results for page {page_num}.")
        print(result.stderr)
        return []
        
    # 2. Parse JSON and get HTML
    with open(results_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # The JSON structure has the image name as the top-level key
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
        
    # 3. Parse HTML to extract rows using BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    rows = soup.find_all('tr')
    
    extracted_voters = []
    
    for row in rows:
        cols = row.find_all(['td', 'th'])
        cols_text = [col.get_text(strip=True) for col in cols]
        
        # We expect data rows to have at least 8 columns and the first column to be a number (serial no)
        if len(cols_text) >= 8 and cols_text[0].isdigit():
            serial_no = int(cols_text[0])
            house_no = cols_text[1]
            voter_name = cols_text[2]
            relative_name = cols_text[4]
            epic_no = cols_text[7]
            
            # Simple validation for EPIC
            if len(epic_no) > 5:
                extracted_voters.append({
                    'serial_no': serial_no,
                    'epic_no': epic_no,
                    'house_no': house_no,
                    'ocr_voter_name_telugu': voter_name,
                    'ocr_relative_name_telugu': relative_name,
                    'source_pdf': pdf_filename,
                    'page_no': page_num
                })
                
    print(f"Extracted {len(extracted_voters)} valid voter rows from page {page_num}.")
    return extracted_voters

def compare_and_queue(extracted_voters, assembly_no, part_no):
    if not extracted_voters:
        return
        
    print(f"Comparing {len(extracted_voters)} voters with Database...")
    
    serial_nos = [v['serial_no'] for v in extracted_voters]
    
    # Query database for these exact Serial Numbers within this Assembly and Part!
    response = supabase.table('voters').select('id, epic_id, serial_no, house_no, voter_name_telugu, relative_name_telugu, voter_name_english, relative_name_english').eq('assembly_no', assembly_no).eq('part_no', part_no).in_('serial_no', serial_nos).execute()
    
    db_voters = {v['serial_no']: v for v in response.data}
    
    staging_inserts = []
    
    for ocr_v in extracted_voters:
        serial = ocr_v['serial_no']
        if serial not in db_voters:
            continue
            
        db_v = db_voters[serial]
        
        # Calculate fuzzy similarity (0 to 100)
        voter_score = fuzz.ratio(ocr_v['ocr_voter_name_telugu'], db_v['voter_name_telugu'] or "")
        rel_score = fuzz.ratio(ocr_v['ocr_relative_name_telugu'], db_v['relative_name_telugu'] or "")
        
        # Take the lowest score as the overall confidence
        min_score = min(voter_score, rel_score)
        
        # If score is below 88%, flag it!
        if min_score < 88:
            print(f"Mismatch Found! EPIC: {ocr_v['epic_no']}")
            print(f"  DB: {db_v['voter_name_telugu']} | OCR: {ocr_v['ocr_voter_name_telugu']} (Score: {voter_score}%)")
            print(f"  DB Rel: {db_v['relative_name_telugu']} | OCR Rel: {ocr_v['ocr_relative_name_telugu']} (Score: {rel_score}%)")
            
            staging_inserts.append({
                'voter_id': db_v['id'],
                'source_pdf': ocr_v['source_pdf'],
                'page_no': ocr_v['page_no'],
                
                'db_epic_id': db_v['epic_id'],
                'db_house_no': db_v['house_no'],
                'ocr_epic_id': ocr_v['epic_no'],
                'ocr_house_no': ocr_v['house_no'],
                
                'db_voter_name_english': db_v['voter_name_english'],
                'db_voter_name_telugu': db_v['voter_name_telugu'],
                'db_relative_name_english': db_v['relative_name_english'],
                'db_relative_name_telugu': db_v['relative_name_telugu'],
                
                'ocr_voter_name_telugu': ocr_v['ocr_voter_name_telugu'],
                'ocr_relative_name_telugu': ocr_v['ocr_relative_name_telugu'],
                'ocr_voter_name_english': None, # We'll let admins translate/correct English manually
                'ocr_relative_name_english': None,
                
                'similarity_score': min_score,
                'status': 'PENDING'
            })
            
    if staging_inserts:
        print(f"Pushing {len(staging_inserts)} mismatched records to Staging Queue...")
        supabase.table('voter_staging_queue').insert(staging_inserts).execute()
        print("Done pushing to queue.")
    else:
        print("All extracted voters match the database perfectly! No discrepancies found.")

def main():
    parser = argparse.ArgumentParser(description="Offline Voter OCR Pipeline")
    parser.add_argument("--assembly", required=True, type=int, help="Assembly Number (e.g., 152)")
    parser.add_argument("--part", required=True, type=int, help="Part Number (e.g., 10)")
    parser.add_argument("--pages", type=str, help="Pages to process (e.g., '1-5' or 'all'). Default is all.", default="all")
    
    args = parser.parse_args()
    
    # 1. Get the PDF
    pdf_filename = get_pdf_for_part(args.assembly, args.part)
    if not pdf_filename:
        print(f"Error: No PDF found in storage for Assembly {args.assembly}, Part {args.part}")
        sys.exit(1)
        
    download_pdf(pdf_filename)
    
    # 2. Convert to Images
    print("Converting PDF to Images (this might take a minute)...")
    images = convert_from_path(pdf_filename, dpi=300)
    print(f"PDF has {len(images)} pages.")
    
    # Parse page range
    start_page = 1
    end_page = len(images)
    
    if args.pages != "all":
        try:
            parts = args.pages.split("-")
            start_page = int(parts[0])
            end_page = int(parts[1]) if len(parts) > 1 else start_page
        except:
            print("Invalid page range format. Using all pages.")
            
    # Create temp dir for page images
    os.makedirs("temp_pages", exist_ok=True)
    
    # 3. Process each page
    for i in range(start_page - 1, min(end_page, len(images))):
        page_num = i + 1
        img_path = f"temp_pages/page_{page_num}.jpg"
        images[i].save(img_path, "JPEG")
        
        extracted_voters = process_page(img_path, page_num, pdf_filename)
        compare_and_queue(extracted_voters, args.assembly, args.part)

    print("\n==================================================")
    print("Pipeline Execution Complete!")
    print("Open http://mindcap.in/admin/review to see the discrepancies.")
    print("==================================================")

if __name__ == "__main__":
    main()
