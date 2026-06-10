import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

jobs = []
for part in range(78, 101):
    jobs.append({
        "assembly_no": 152,
        "part_no": part,
        "status": "pending"
    })

res = supabase.table("qc_jobs").insert(jobs).execute()
print(f"Queued {len(jobs)} jobs in Supabase.")
