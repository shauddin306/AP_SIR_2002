import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../.env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

print("Fetching all staging items...")
res = supabase.table("voter_staging_queue").select("*").execute()
staging_items = res.data

if not staging_items:
    print("Nothing in queue!")
else:
    print(f"Found {len(staging_items)} items to auto-approve.")
    # Remove id and job_id, insert to voters
    for item in staging_items:
        voter_data = {k: v for k, v in item.items() if k not in ["id", "job_id", "status", "created_at", "updated_at"]}
        supabase.table("voters").insert(voter_data).execute()
        supabase.table("voter_staging_queue").delete().eq("id", item["id"]).execute()
    print("Successfully auto-approved all items!")
