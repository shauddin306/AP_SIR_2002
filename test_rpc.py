import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")
supabase = create_client(os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

try:
    res = supabase.rpc("get_available_parts", {"p_assembly_no": 152}).execute()
    print("RPC Success:", res.data)
except Exception as e:
    print("RPC Failed:", str(e))
