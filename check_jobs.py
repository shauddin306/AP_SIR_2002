import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

res = supabase.table("extraction_jobs").select("*").eq("part_no", 189).execute()
print(f"Jobs 189: {res.data}")
