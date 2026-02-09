import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')
s = create_client(url, key)

# Get all doctors
print("=== All Doctors ===")
doctors = s.table('doctors').select('id, name, specialty').execute()
for d in doctors.data:
    print(f"  {d['name']} ({d['specialty']})")
    print(f"    ID: {d['id']}")
    print()

# Find Sneha Reddy
print("=== Looking for Sneha Reddy ===")
for d in doctors.data:
    if 'sneha' in d.get('name','').lower():
        print(f"FOUND: {d['name']}")
        print(f"ID: {d['id']}")
        print(f"Specialty: {d['specialty']}")
