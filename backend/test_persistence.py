import requests
import json
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

# Load env to access DB directly for verification
load_dotenv()
from supabase import create_client

def test_persistence():
    print("=== TESTING ENCOUNTER PERSISTENCE ===")
    
    # 1. Setup Data
    patient_id = "test_patient_" + str(uuid.uuid4())[:8]
    doctor_id = "test_doc_" + str(uuid.uuid4())[:8] # In real app, this should be a valid UUID from doctors table, but encounters might allow null or we mock it if FK is strict
    
    # We need a valid doctor UUID if foreign key constraints exist. 
    # Let's fetch one real doctor just in case
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    supabase = create_client(url, key)
    
    doctors = supabase.table("doctors").select("id").limit(1).execute()
    if doctors.data:
        doctor_id = doctors.data[0]["id"]
    
    print(f"Using Doctor ID: {doctor_id}")
    print(f"Using Patient ID: {patient_id}")

    # 2. Simulate Finalize Request
    soap_note = {
        "Subjective": "Patient reports testing.",
        "Objective": "Vitals normal.",
        "Assessment": "Test syndrome.",
        "Plan": "Monitor."
    }
    
    icd_codes = [
        {"code": "T35.7", "description": "Test diagnosis"}
    ]
    
    # We need to manually "create" a draft in the backend memory because the endpoint looks for it
    # But since we can't easily inject into the running server's memory from here without a huge workaround,
    # We will rely on the fact that the endpoint MIGHT fail if draft is missing, OR we fix the endpoint to be robust.
    # Looking at the code: `patient_drafts = draft_soaps_store.get(request.patient_id, {})`
    # If we pass a draft_id that doesn't exist, it might skip the session enrichment but SHOULD still persist the encounter
    # because the `upsert_encounter` call is inside the `try` block but `draft_data` defaults to {}.
    
    # Let's try calling the endpoint
    payload = {
        "draft_id": "draft_test_123", # Fake draft ID
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "final_soap": soap_note,
        "diagnosis_codes": ["T35.7 - Test Code"], # The endpoint expects strings or list of strings usually? 
        # In the code: `request.diagnosis_codes` -> stored as `icd_codes`
        "notes": "Test persistence note"
    }
    
    response = requests.post("http://localhost:8000/soap/finalize", json=payload)
    
    if response.status_code == 200:
        print("✅ API Call Successful")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)
        
        # 3. Verify in Database
        print("Verifying in database...")
        # Give it a split second
        import time
        time.sleep(1)
        
        # Query encounters for this patient
        res = supabase.table("encounters").select("*").eq("patient_id", patient_id).execute()
        
        if res.data:
            print(f"✅ Found {len(res.data)} encounter record(s)")
            record = res.data[0]
            
            # Check ICD codes
            db_icds = record.get("icd_codes")
            print(f"Stored ICD Codes: {db_icds}")
            
            if db_icds and len(db_icds) > 0:
                 print("✅ ICD Codes persisted correctly!")
            else:
                 print("❌ ICD Codes NOT found in DB!")
                 
            # Check SOAP
            db_soap = record.get("final_soap")
            if db_soap == soap_note:
                 print("✅ SOAP Note persisted correctly!")
            else:
                 print(f"❌ SOAP Note mismatch! {db_soap}")
                 
        else:
            print("❌ No encounter record found in DB!")
            
    else:
        print(f"❌ API Call Failed: {response.text}")

if __name__ == "__main__":
    test_persistence()
