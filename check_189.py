import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

res = supabase.table("voters").select("*", count="exact").eq("part_no", 189).execute()
print(f"Total voters in part 189: {res.count}")

jobs = supabase.table("jobs").select("*").eq("part_no", 189).execute()
print(f"Jobs for part 189: {jobs.data}")
