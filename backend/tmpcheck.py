from dotenv import load_dotenv
import os
from supabase import create_client, Client

load_dotenv()  # ← this line is crucial

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("Supabase URL:", SUPABASE_URL)  # debug check, optional

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
