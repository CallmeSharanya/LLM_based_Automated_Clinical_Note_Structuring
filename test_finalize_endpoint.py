
import requests
import json
import uuid

url = "http://localhost:8000/encounter/finalize"

payload = {
    "encounter_id": f"test-enc-{uuid.uuid4()}",
    "final_soap": json.dumps({
        "Subjective": "Test Subjective",
        "Objective": "Test Objective",
        "Assessment": "Test Assessment",
        "Plan": "Test Plan"
    }),
    "generate_summary": True,
    "patient_id": "test-patient-123"
}

headers = {}

try:
    print(f"🚀 Sending POST request to {url}...")
    # Use data=payload for Form Data
    response = requests.post(url, data=payload, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("✅ Backend is working correctly!")
    else:
        print("❌ Backend returned error.")

except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("Is the backend server running?")
