import json
import os

PROGRESS_FILE = 'auto_progress.json'
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE, 'r') as f:
        data = json.load(f)
    
    new_data = {}
    for k, v in data.items():
        try:
            part = int(k.split('_')[1])
            if part < 68:
                new_data[k] = v
            else:
                print(f"Resetting part {k}")
        except Exception:
            new_data[k] = v
            
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(new_data, f, indent=4)
    print("Progress reset complete.")
else:
    print("auto_progress.json not found.")
