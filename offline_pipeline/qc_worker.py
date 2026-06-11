import os
import sys
import time
import subprocess
import json
import requests
import re
from pdf2image import convert_from_path, pdfinfo_from_path
from dotenv import load_dotenv

from qc_auto_approve import supabase, get_pdf_for_part, download_pdf, process_page, auto_correct_and_queue

def fetch_pending_job():
    res = supabase.table('qc_jobs').select('*').eq('status', 'pending').order('created_at').limit(1).execute()
    if res.data:
        return res.data[0]
    return None

def update_job_status(job_id, status, error=None, total_pages=None, processed_pages=None):
    update_data = {"status": status}
    if error is not None:
        update_data["error_message"] = error
    if total_pages is not None:
        update_data["total_pages"] = total_pages
    if processed_pages is not None:
        update_data["processed_pages"] = processed_pages
        
    supabase.table('qc_jobs').update(update_data).eq('id', job_id).execute()

def process_job(job):
    job_id = job['id']
    assembly_no = job['assembly_no']
    part_no = job['part_no']
    
    print(f"\n--- Starting Job: Assembly {assembly_no}, Part {part_no} ---")
    update_job_status(job_id, 'in_progress')
    
    try:
        pdf_filename = get_pdf_for_part(assembly_no, part_no)
        if not pdf_filename:
            error = f"No PDF found in storage for Assembly {assembly_no}, Part {part_no}"
            print(error)
            update_job_status(job_id, 'failed', error=error)
            return

        print(f"Using PDF: {pdf_filename}")
        
        os.makedirs("temp_pages", exist_ok=True)
        if not os.path.exists(pdf_filename):
            print(f"Downloading {pdf_filename} from Supabase...")
            download_pdf(pdf_filename)
        else:
            print(f"PDF {pdf_filename} already exists locally.")

        pdf_info = pdfinfo_from_path(pdf_filename)
        total_pages = pdf_info["Pages"]
        
        start_page = 1
        processed_pages = job.get('processed_pages')
        if processed_pages and processed_pages > 0:
            start_page = processed_pages + 1
            print(f"Total pages in PDF: {total_pages} (Resuming from page {start_page})")
            update_job_status(job_id, 'in_progress', total_pages=total_pages)
        else:
            print(f"Total pages in PDF: {total_pages}")
            update_job_status(job_id, 'in_progress', total_pages=total_pages, processed_pages=0)

        output_folder = os.path.join("temp_pages", f"{assembly_no}_{part_no}")
        os.makedirs(output_folder, exist_ok=True)

        for page_num in range(start_page, total_pages + 1):
            image_path = os.path.join(output_folder, f"page_{page_num}.jpg")
            if not os.path.exists(image_path):
                print(f"Converting page {page_num}...")
                pages = convert_from_path(pdf_filename, dpi=300, first_page=page_num, last_page=page_num)
                pages[0].save(image_path, 'JPEG')
            
            print(f"Extracting voters from page {page_num}...")
            extracted_voters = process_page(image_path, page_num, pdf_filename)
            
            if extracted_voters:
                auto_correct_and_queue(extracted_voters, assembly_no, part_no, page_num)
            
            update_job_status(job_id, 'in_progress', processed_pages=page_num)
            
        update_job_status(job_id, 'completed')
        print(f"--- Finished Job: Assembly {assembly_no}, Part {part_no} ---")
        
    except Exception as e:
        print(f"Error processing job: {e}")
        update_job_status(job_id, 'failed', error=str(e))

def main():
    print("Starting Hybrid QC Worker...")
    while True:
        try:
            job = fetch_pending_job()
            if job:
                process_job(job)
            else:
                time.sleep(5)
        except Exception as e:
            print(f"Worker loop error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
