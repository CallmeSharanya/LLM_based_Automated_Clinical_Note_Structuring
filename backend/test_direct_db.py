from db_utils import upsert_encounter
import uuid
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def test_direct():
    print("Testing upsert_encounter directly...")
    
    patient_id = "direct_test_" + str(uuid.uuid4())[:8]
    encounter_data = {
        "patient_id": patient_id,
        "encounter_status": "completed",
        "final_soap": {"test": "data"},
        "icd_codes": [{"code": "A00", "description": "Test"}],
        "completed_at": datetime.now().isoformat()
    }
    
    result = upsert_encounter(encounter_data)
    print(f"Result: {result}")
    
    if result.get("success"):
        print("✅ Direct upsert success")
    else:
        print(f"❌ Direct upsert failed: {result.get('error')}")

if __name__ == "__main__":
    test_direct()
