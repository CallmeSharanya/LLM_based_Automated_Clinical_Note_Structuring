import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')
s = create_client(url, key)

print("=== SUPABASE TABLE ANALYSIS ===\n")

# Check doctors table
print("1. DOCTORS TABLE:")
doctors = s.table('doctors').select('*').limit(3).execute()
if doctors.data:
    print(f"   Found {len(doctors.data)} doctors (showing first 3)")
    for d in doctors.data:
        print(f"   - {d.get('name')} ({d.get('specialty')}): {d.get('id')}")
else:
    print("   No doctors found!")

# Check appointments table  
print("\n2. APPOINTMENTS TABLE:")
appointments = s.table('appointments').select('*').limit(5).execute()
if appointments.data:
    print(f"   Found {len(appointments.data)} appointments (showing first 5)")
    for a in appointments.data:
        print(f"   - Patient: {a.get('patient_email', a.get('patient_name', 'Unknown'))}")
        print(f"     Doctor ID: {a.get('doctor_id')}")
        print(f"     Date: {a.get('date')}, Status: {a.get('status')}")
else:
    print("   No appointments found!")

# Check if patients table exists
print("\n3. PATIENTS TABLE:")
try:
    patients = s.table('patients').select('*').limit(3).execute()
    if patients.data:
        print(f"   Found {len(patients.data)} patients")
        for p in patients.data:
            print(f"   - {p.get('name', p.get('email', 'Unknown'))}: {p.get('id')}")
    else:
        print("   Table exists but no patients!")
except Exception as e:
    print(f"   Table does not exist or error: {e}")

# Check clinical_notes table
print("\n4. CLINICAL_NOTES TABLE:")
try:
    notes = s.table('clinical_notes').select('*').limit(3).execute()
    if notes.data:
        print(f"   Found {len(notes.data)} notes")
        for n in notes.data:
            print(f"   - Patient: {n.get('patient_id')}, Doctor: {n.get('doctor_id')}")
            print(f"     Source: {n.get('source')}, Status: {n.get('status')}")
    else:
        print("   Table exists but no notes!")
except Exception as e:
    print(f"   Table does not exist or error: {e}")

# Check draft_soaps or pending_soaps table
print("\n5. SOAP-RELATED TABLES:")
for table_name in ['draft_soaps', 'pending_soaps', 'soap_notes']:
    try:
        data = s.table(table_name).select('*').limit(2).execute()
        if data.data:
            print(f"   {table_name}: Found {len(data.data)} records")
        else:
            print(f"   {table_name}: Table exists but empty")
    except Exception as e:
        print(f"   {table_name}: Does not exist")
