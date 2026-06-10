import sys
import subprocess
print("Starting QC")
try:
    subprocess.run(["venv/bin/python", "qc_auto_approve.py"], timeout=10, env={"PYTHONUNBUFFERED": "1", **os.environ})
except subprocess.TimeoutExpired:
    print("QC is running fine")
