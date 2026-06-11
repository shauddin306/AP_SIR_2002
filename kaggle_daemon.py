import os
import sys
import time
import requests
import base64
import traceback
import cv2
import numpy as np
from PIL import Image
from pdf2image import convert_from_path
from supabase import create_client, Client

# Add the OCR engine to path so we can import its extraction logic directly
sys.path.append(os.path.join(os.path.dirname(__file__), 'python-engine-ocr'))
from main import extract_voters, ExtractRequest, get_models

def init_supabase() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: Supabase URL and Key must be set in environment variables.")
        sys.exit(1)
    return create_client(url, key)

def download_pdf(supabase: Client, file_name: str, local_path: str):
    print(f"[*] Downloading {file_name} from Supabase Storage...")
    res = supabase.storage.from_("voter-pdfs").download(file_name)
    with open(local_path, "wb") as f:
        f.write(res)
    print(f"[+] Download complete: {len(res)} bytes.")

def process_job(supabase: Client, job: dict):
    job_id = job["id"]
    assembly_no = job["assembly_no"]
    part_no = job["part_no"]
    file_name = job["source_pdf"]
    
    print(f"\n=======================================================")
    print(f"🚀 Processing Job: {job_id}")
    print(f"Assembly: {assembly_no}, Part: {part_no}")
    
    # Mark as running
    supabase.table("extraction_jobs").update({"status": "running"}).eq("id", job_id).execute()
    
    local_pdf = f"temp_{job_id}.pdf"
    try:
        download_pdf(supabase, file_name, local_pdf)
        
        print("[*] Converting PDF to images (this takes a moment)...")
        # Extract pages using pdf2image
        # Skip first 2 pages (index 0 and 1) as they are usually summary/header pages
        pages = convert_from_path(local_pdf, dpi=150)
        total_pages = len(pages)
        print(f"[+] Extracted {total_pages} pages.")
        
        all_voters = []
        
        for idx in range(2, total_pages):
            page_no = idx + 1
            print(f"  -> Processing Page {page_no}/{total_pages}...")
            
            # Convert PIL image to OpenCV format
            pil_img = pages[idx].convert('RGB')
            open_cv_image = np.array(pil_img)
            # Convert RGB to BGR 
            open_cv_image = open_cv_image[:, :, ::-1].copy() 
            
            # Encode as base64 to pass to the extract_voters function
            _, buffer = cv2.imencode('.jpg', open_cv_image)
            b64 = base64.b64encode(buffer).decode('utf-8')
            
            req = ExtractRequest(image_base64=b64, page_no=page_no)
            
            # The extract_voters function automatically handles bounding boxes, Surya OCR, and row-table fallbacks
            result = extract_voters(req)
            voters = result.get("voters", [])
            print(f"     Found {len(voters)} voters on page {page_no}.")
            
            all_voters.extend(voters)
            
        print(f"[*] Total voters extracted across all pages: {len(all_voters)}")
        
        if len(all_voters) > 0:
            print("[*] Sending data to /api/voter-ingest for deduplication and insertion...")
            
            # Append assembly_no and part_no to all extracted records
            for v in all_voters:
                v['assembly_no'] = assembly_no
                v['part_no'] = part_no
            
            gateway_secret = os.environ.get("INGEST_GATEWAY_SECRET", "voter_engine_secret_key_2026")
            
            # Send to live production API
            payload = {
                "volunteers_data": all_voters,
                "volunteer_id": "kaggle_daemon"
            }
            headers = {
                "Authorization": f"Bearer {gateway_secret}",
                "Content-Type": "application/json"
            }
            
            api_url = "https://www.mindcap.in/api/voter-ingest"
            resp = requests.post(api_url, json=payload, headers=headers)
            
            if resp.status_code == 200:
                print(f"[+] Successfully saved {len(all_voters)} voters to database via API!")
                supabase.table("extraction_jobs").update({"status": "done"}).eq("id", job_id).execute()
            else:
                print(f"[-] API Error {resp.status_code}: {resp.text}")
                supabase.table("extraction_jobs").update({"status": "error", "error_message": f"API Error: {resp.text}"}).eq("id", job_id).execute()
        else:
            print("[-] No voters found in PDF.")
            supabase.table("extraction_jobs").update({"status": "error", "error_message": "No voters extracted."}).eq("id", job_id).execute()
            
    except Exception as e:
        err_msg = str(e)
        print(f"[-] Job failed: {err_msg}")
        traceback.print_exc()
        supabase.table("extraction_jobs").update({"status": "error", "error_message": err_msg}).eq("id", job_id).execute()
    finally:
        if os.path.exists(local_pdf):
            os.remove(local_pdf)

def main():
    print("==================================================")
    print("🤖 Kaggle Distributed GPU Worker Daemon Started!")
    print("==================================================")
    
    supabase = init_supabase()
    
    # Preload PyTorch Models to GPU to save time on the first job
    print("[*] Pre-loading Surya OCR PyTorch models into GPU memory...")
    get_models()
    
    print("[*] Polling Supabase for pending jobs every 10 seconds...")
    
    while True:
        try:
            # Poll for the oldest 'pending' job
            res = supabase.table("extraction_jobs").select("*").eq("status", "pending").order("created_at").limit(1).execute()
            
            if res.data and len(res.data) > 0:
                job = res.data[0]
                process_job(supabase, job)
            else:
                time.sleep(10)
        except Exception as e:
            print(f"[-] Polling error: {str(e)}")
            time.sleep(10)

if __name__ == "__main__":
    main()
