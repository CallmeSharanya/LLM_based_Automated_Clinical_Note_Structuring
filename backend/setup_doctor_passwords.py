"""
Script to add password_hash column and set demo passwords for doctors in Supabase
Run this once to enable doctor login
"""
import os
import hashlib
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_KEY')
s = create_client(url, key)

# Generate password hash (same algorithm as auth.py)
def hash_password(password: str) -> str:
    salt = "clinical_ehr_salt_2026"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

demo_hash = hash_password("demo123")
print(f"Password hash for 'demo123': {demo_hash}")

# First, check if password_hash column exists
print("\n=== Updating Doctor Passwords ===")

try:
    # Try to update - if column doesn't exist, this will fail
    result = s.table('doctors').update({
        'password_hash': demo_hash
    }).neq('id', '00000000-0000-0000-0000-000000000000').execute()  # Update all
    
    print(f"✅ Updated {len(result.data)} doctors with demo password (demo123)")
    
except Exception as e:
    if 'password_hash' in str(e).lower() or 'column' in str(e).lower():
        print("❌ Column 'password_hash' doesn't exist in doctors table.")
        print("\n📋 Run this SQL in Supabase SQL Editor:")
        print("-" * 50)
        print("""
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS password_hash TEXT;
        """)
        print("-" * 50)
        print("\nThen run this script again.")
    else:
        print(f"Error: {e}")

# Verify
print("\n=== Verification ===")
doctors = s.table('doctors').select('name, email, password_hash').limit(3).execute()
for d in doctors.data:
    has_pw = "✅" if d.get('password_hash') else "❌"
    print(f"  {d['name']}: {has_pw}")

print("\n=== Doctor Login Credentials ===")
doctors_all = s.table('doctors').select('id, name, email').execute()
for d in doctors_all.data[:5]:
    print(f"  {d['name']}")
    print(f"    ID: {d['id']}")
    print(f"    Email: {d['email']}")
    print(f"    Password: demo123")
    print()
