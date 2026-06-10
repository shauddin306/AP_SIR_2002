import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../.env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

filename = "152_188_1781031753797.pdf"
res = supabase.storage.from_("voter-pdfs").download(filename)

with open(filename, "wb") as f:
    f.write(res)
print(f"Downloaded {filename}")
