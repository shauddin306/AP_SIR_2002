import os
from supabase import create_client

supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
supabase.table("extraction_jobs").update({"status": "pending"}).eq("status", "running").execute()
print("Reset running jobs to pending.")
