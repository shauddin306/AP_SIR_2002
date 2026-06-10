import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../.env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

print("Emptying voter_staging_queue...")
supabase.table("voter_staging_queue").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print("Queue is empty.")
