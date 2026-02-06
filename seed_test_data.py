import os
import uuid
import json
from datetime import datetime
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
    print("🚀 Seeding test data...")
    
    # 1. Get or Create Patient
    patient_id = None
    patients = supabase.table("patients").select("id").limit(1).execute()
    if patients.data:
        patient_id = patients.data[0]['id']
        print(f"✅ Found existing patient: {patient_id}")
    else:
        print("⚠️ No patients found. Creating test patient...")
        patient_id = str(uuid.uuid4())
        new_patient = {
            "id": patient_id,
            "name": "Test Patient",
            "age": 30,
            "gender": "Male",
            "contact_info": {"phone": "555-0199"},
            "created_at": datetime.now().isoformat()
        }
        supabase.table("patients").insert(new_patient).execute()
        print(f"✅ Created test patient: {patient_id}")

    # 2. Create Encounter
    encounter_id = str(uuid.uuid4())
    soap_note = {
        "Subjective": "Patient reports testing the system.",
        "Objective": "System appears to be functional.",
        "Assessment": "System is working.",
        "Plan": "Verify dashboard count."
    }
    
    new_encounter = {
        "id": encounter_id,
        "patient_id": patient_id,
        "final_soap": soap_note,
        "encounter_status": "completed",
        "completed_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    supabase.table("encounters").insert(new_encounter).execute()
    print(f"✅ inserted test encounter: {encounter_id}")
    print("🎉 SUCCESS! Please refresh your dashboard.")

except Exception as e:
    print(f"❌ Error: {e}")
