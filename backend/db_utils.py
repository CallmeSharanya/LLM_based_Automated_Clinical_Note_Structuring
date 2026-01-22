import os
from supabase import create_client, Client
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Handle missing credentials gracefully
if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("[WARNING] SUPABASE_URL or SUPABASE_KEY not found. Database operations will fail.")
    supabase = None


def insert_note(note: dict):
    """Insert a clinical note into the database"""
    if not supabase:
        print("[ERROR] Cannot insert note: Supabase not configured")
        return {"error": "Database not configured", "note": note}
    
    data = {
        "patient_id": note.get("patient_id"),
        "raw_text": note.get("raw_text"),
        "deidentified_text": note.get("deidentified_text"),
        "subjective": note.get("subjective"),
        "objective": note.get("objective"),
        "assessment": note.get("assessment"),
        "plan": note.get("plan"),
        "icd_json": json.dumps(note.get("icd_json") or []),
        "embedding": note.get("embedding") if note.get("embedding") else None,
    }

    try:
        result = supabase.table("clinical_notes").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[ERROR] Error inserting note: {e}")
        return {"error": str(e)}


def fetch_similar_notes(query_emb, top_k=3):
    """Fetch similar notes using vector similarity search"""
    if not supabase:
        print("[ERROR] Cannot fetch notes: Supabase not configured")
        return []
    
    try:
        # Try using the match_notes RPC function if it exists
        try:
            result = supabase.rpc(
                "match_notes",
                {
                    "query_embedding": list(query_emb),
                    "match_count": top_k
                }
            ).execute()
            if result.data:
                return result.data
        except Exception as rpc_error:
            print(f"[WARNING] RPC function not available: {rpc_error}")
        
        # Fallback: Get most recent notes if vector search not available
        result = supabase.table("clinical_notes").select("*").order("id", desc=True).limit(top_k).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"[ERROR] Error fetching similar notes: {e}")
        return []


def get_all_notes():
    """Fetch all clinical notes for analytics"""
    if not supabase:
        print("[ERROR] Cannot fetch notes: Supabase not configured")
        return []
    
    try:
        result = supabase.table("clinical_notes").select("*").execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"[ERROR] Error fetching all notes: {e}")
        return []