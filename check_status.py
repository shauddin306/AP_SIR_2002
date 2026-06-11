import os
from supabase import create_client

supabase = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
res = supabase.table("extraction_jobs").select("status", count="exact").execute()

from collections import Counter
counts = Counter()
# Supabase Python count="exact" returns all data. Let's just group them.
res = supabase.table("extraction_jobs").select("status").execute()
for r in res.data:
    counts[r["status"]] += 1

print("--- AWS Cluster Status ---")
print(f"Pending: {counts['pending']}")
print(f"Running (Processing): {counts['running']}")
print(f"Done: {counts['done']}")
print(f"Error: {counts['error']}")
