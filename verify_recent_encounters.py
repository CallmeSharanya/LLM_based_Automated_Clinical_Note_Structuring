import os

# Manually load .env
try:
    with open("backend/.env", "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"): continue
            if "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()
except Exception as e:
    print(f"Failed to load .env: {e}")

from supabase import create_client

try:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        print("❌ Missing Supabase credentials in .env")
        exit(1)

    supabase = create_client(url, key)
    
    # Query encounters
    print("\n🔍 Checking 'encounters' table for recent entries...")
    response = supabase.table("encounters") \
        .select("id, patient_id, encounter_status, created_at, updated_at") \
        .order("created_at", desc=True) \
        .limit(5) \
        .execute()
        
    if not response.data:
        print("⚠️ No encounters found in database.")
    else:
        print(f"✅ Found {len(response.data)} recent encounters:")
        for enc in response.data:
            print(f"   - ID: {enc.get('id')}")
            print(f"     Patient: {enc.get('patient_id')}")
            print(f"     Status: {enc.get('encounter_status')}")
            print(f"     Created: {enc.get('created_at')}")
            print("---")

except Exception as e:
    print(f"❌ Error verifying DB: {e}")
