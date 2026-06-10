import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

res = supabase.table("voters").select("part_no").eq("assembly_no", 152).execute()
parts = set(r["part_no"] for r in res.data)
print(f"Parts found in DB: {sorted(list(parts))}")
