import os
from supabase import create_client

# Manually load .env
env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '.env')

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ Missing credentials")
    exit(1)

supabase = create_client(url, key)

try:
    print("Checking encounters table...")
    # Count all
    response = supabase.table("encounters").select("id", count="exact").execute()
    print(f"Total Encounters in DB: {response.count}")
    
    # List first 5
    data = supabase.table("encounters").select("*").limit(5).execute()
    print(f"Sample stored data: {len(data.data)} records")
    for rec in data.data:
        print(f" - ID: {rec.get('id')}, Patient: {rec.get('patient_id')}, Status: {rec.get('encounter_status')}")

except Exception as e:
    print(f"❌ Error: {e}")
