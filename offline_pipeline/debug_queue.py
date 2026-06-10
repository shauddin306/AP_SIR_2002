import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../.env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

res = supabase.table("voter_staging_queue").select("id", count="exact").execute()
print(f"Items pending in voter_staging_queue: {res.count}")
