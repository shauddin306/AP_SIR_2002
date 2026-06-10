import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client, Client

def main():
    if len(sys.argv) < 2:
        print("Usage: python revert_qc.py <part_no>")
        sys.exit(1)
        
    part_no = sys.argv[1]
    backup_file = f"qc_backups_part_{part_no}.json"
    
    if not os.path.exists(backup_file):
        print(f"Error: Backup file {backup_file} not found.")
        sys.exit(1)
        
    # Load environment variables
    load_dotenv('../.env.local')
    
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Error: Missing Supabase credentials in .env.local")
        sys.exit(1)
        
    supabase: Client = create_client(url, key)
    
    with open(backup_file, 'r') as f:
        backups = json.load(f)
        
    print(f"Loaded {len(backups)} records to revert for part {part_no}...")
    
    success_count = 0
    for record in backups:
        voter_id = record['voter_id']
        original_name = record['original_voter_name_telugu']
        original_rel = record['original_relative_name_telugu']
        
        update_data = {}
        if original_name is not None:
            update_data["voter_name_telugu"] = original_name
        if original_rel is not None:
            update_data["relative_name_telugu"] = original_rel
            
        res = supabase.table('voters').update(update_data).eq('id', voter_id).execute()
        
        if res.data:
            success_count += 1
            print(f"Reverted voter ID {voter_id}")
        else:
            print(f"Failed to revert voter ID {voter_id}")
            
    print(f"\\nFinished Revert! Successfully restored {success_count} / {len(backups)} records.")

if __name__ == "__main__":
    main()
