
import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')

if not url or not key:
    print("Error: Supabase credentials not found in .env")
    exit()

supabase = create_client(url, key)

def print_icds(table_name):
    print(f"\n=== Checking ICDs in '{table_name}' table ===")
    try:
        # Fetch last 5 records
        response = supabase.table(table_name).select("*").order("id", desc=True).limit(5).execute()
        
        if not response.data:
            print("No records found.")
            return

        for record in response.data:
            print(f"\nID: {record.get('id')}")
            # Check both possible column names
            icds = record.get('icd_json') or record.get('icd_codes')
            
            if icds:
                print(f"✅ Found ICD Codes: {json.dumps(icds, indent=2)}")
            else:
                print("❌ No ICD Codes found (None or Empty)")
                
    except Exception as e:
        print(f"Error querying table: {e}")

# Check both tables to be sure
print_icds("encounters")
print_icds("clinical_notes")
