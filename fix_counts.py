import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

# 1. Get all parts
parts_res = supabase.table("voter_parts").select("id, assembly_no, part_no").execute()

# 2. For each part, get the exact count from voters table
for part in parts_res.data:
    count_res = supabase.table("voters").select("*", count="exact").eq("assembly_no", part['assembly_no']).eq("part_no", part['part_no']).execute()
    actual_count = count_res.count
    
    print(f"Updating Assembly {part['assembly_no']} Part {part['part_no']} to {actual_count} voters")
    supabase.table("voter_parts").update({"voter_count": actual_count}).eq("id", part["id"]).execute()

print("Done sync!")
