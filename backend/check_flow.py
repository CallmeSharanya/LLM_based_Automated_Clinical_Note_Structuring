import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
import hashlib

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')
s = create_client(url, key)

print("=== DOCTOR PASSWORD CHECK ===\n")

# Check if doctors have password_hash
doctors = s.table('doctors').select('id, name, password_hash').execute()
for d in doctors.data[:5]:
    has_pw = "✅ YES" if d.get('password_hash') else "❌ NO"
    print(f"  {d['name']}: {has_pw}")

# Check Dr. Sneha Reddy specifically
sneha = [d for d in doctors.data if 'sneha' in d.get('name', '').lower()]
if sneha:
    print(f"\n  Dr. Sneha Reddy ID: {sneha[0]['id']}")
    print(f"  Has password: {'YES' if sneha[0].get('password_hash') else 'NO'}")

# Generate demo password hash for reference
salt = "clinical_ehr_salt_2026"
demo_hash = hashlib.sha256(f"demo123{salt}".encode()).hexdigest()
print(f"\n  Demo password hash (demo123): {demo_hash[:20]}...")

print("\n=== APPOINTMENTS FOR DR. SNEHA REDDY ===")
sneha_id = "63fd0dd6-6bcf-4cf7-947a-e9931aafe27e"
appointments = s.table('appointments').select('*').eq('doctor_id', sneha_id).execute()
print(f"Found {len(appointments.data)} appointments")
for a in appointments.data[:3]:
    print(f"  - Patient: {a.get('patient_email', a.get('patient_name', 'Unknown'))}")
    print(f"    Date: {a.get('date')}, Time: {a.get('time')}")
    print(f"    Status: {a.get('status')}")

print("\n=== CLINICAL NOTES CHECK ===")
notes = s.table('clinical_notes').select('*').limit(5).execute()
print(f"Found {len(notes.data)} clinical notes")
for n in notes.data[:3]:
    print(f"  - Patient: {n.get('patient_id')}")
    print(f"    Doctor: {n.get('doctor_id')}")
    print(f"    Status: {n.get('status')}")
