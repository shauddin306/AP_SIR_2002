import time
import requests
import json
import os
import subprocess
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='.env.local')

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
API_BASE_URL = os.environ.get("API_BASE_URL", "https://www.mindcap.in/api")
GATEWAY_SECRET = "voter_engine_secret_123!"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def download_pdf_from_storage(file_name, local_path):
    print(f"[*] Downloading {file_name} from Supabase Storage...")
    res = supabase.storage.from_("voter-pdfs").download(file_name)
    with open(local_path, "wb") as f:
        f.write(res)
    print(f"[+] Download complete.")

def mark_job_status(job_id, status, error_msg=None, total_voters=0):
    update_data = {"status": status, "total_voters": total_voters}
    if error_msg:
        update_data["error_message"] = error_msg
    supabase.table("extraction_jobs").update(update_data).eq("id", job_id).execute()

def process_job(job):
    job_id = job["id"]
    assembly_name = job["assembly_name"]
    assembly_no = job["assembly_no"]
    part_no = job["part_no"]
    file_name = job["source_pdf"]

    print(f"\n=============================================")
    print(f"🚀 Processing Job: {job_id}")
    print(f"Assembly: {assembly_no} - {assembly_name}, Part: {part_no}")
    
    mark_job_status(job_id, "running")
    local_pdf = f"temp_{file_name}"
    
    try:
        # 1. Download
        download_pdf_from_storage(file_name, local_pdf)
        
        # 2. Extract (using existing voter_engine.py logic, but adapted)
        # Instead of rewriting all of voter_engine here, let's just import and run it!
        import voter_engine_daemon
        total_voters = voter_engine_daemon.run_pipeline(
            pdf_path=local_pdf, 
            assembly_no=assembly_no, 
            part_no=part_no, 
            assembly_name=assembly_name
        )
        
        # 3. Done
        mark_job_status(job_id, "done", total_voters=total_voters)
        print(f"[+] Job {job_id} COMPLETED SUCCESSFULLY! Total: {total_voters}")
        
    except Exception as e:
        print(f"[-] Job failed: {str(e)}")
        mark_job_status(job_id, "error", error_msg=str(e))
    finally:
        if os.path.exists(local_pdf):
            os.remove(local_pdf)

def main():
    print("🤖 AWS GPU Worker Daemon Started...")
    print("Polling Supabase for pending jobs every 15 seconds...")
    
    while True:
        try:
            # Poll for 'pending' jobs
            res = supabase.table("extraction_jobs").select("*").eq("status", "pending").order("created_at").limit(1).execute()
            if res.data and len(res.data) > 0:
                job = res.data[0]
                process_job(job)
            else:
                time.sleep(15)
        except Exception as e:
            print(f"[-] Polling error: {str(e)}")
            time.sleep(15)

if __name__ == "__main__":
    main()
