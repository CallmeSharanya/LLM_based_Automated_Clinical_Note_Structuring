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
        
        # Fallback: Get most recent entries from ENCOUNTERS table
        # We query 'encounters' because that's where the app saves data now.
        result = supabase.table("encounters").select("*").order("updated_at", desc=True).limit(top_k).execute()
        
        
        notes = []
        if result.data:
            for item in result.data:
                # Normalize structure for RAG
                soap = item.get("final_soap", {})
                if isinstance(soap, str):
                    try:
                        soap = json.loads(soap)
                    except:
                        soap = {}
                
                notes.append({
                    "subjective": soap.get("Subjective"),
                    "objective": soap.get("Objective"),
                    "assessment": soap.get("Assessment"),
                    "plan": soap.get("Plan"),
                    "raw_text": json.dumps(soap), # Keep raw text just in case
                    "created_at": item.get("completed_at"),
                    "patient_id": item.get("patient_id")
                })
        return notes
    except Exception as e:
        print(f"[ERROR] Error fetching similar notes: {e}")
        return []


def get_all_notes():
    """Fetch all clinical notes for analytics"""
    if not supabase:
        print("[ERROR] Cannot fetch notes: Supabase not configured")
        return []
    
    try:
        # Query encounters table
        result = supabase.table("encounters").select("*").execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"[ERROR] Error fetching all notes: {e}")
        return []


def upsert_encounter(encounter_data: dict):
    """
    Insert or update an encounter record in the database.
    This is used to persist finalized SOAP notes and ICD codes.
    """
    if not supabase:
        print("[ERROR] Cannot upsert encounter: Supabase not configured")
        return {"error": "Database not configured"}
    
    try:
        # If encounter_id is provided, try to update
        if encounter_data.get("id"):
            response = supabase.table("encounters").update(encounter_data).eq("id", encounter_data["id"]).execute()
            if response.data:
                return {"success": True, "data": response.data[0]}
        
        # If intake_session_id is provided, try to find one to update
        if encounter_data.get("intake_session_id"):
            existing = supabase.table("encounters").select("id").eq("intake_session_id", encounter_data["intake_session_id"]).execute()
            if existing.data:
                # Update existing using the found ID
                enc_id = existing.data[0]["id"]
                response = supabase.table("encounters").update(encounter_data).eq("id", enc_id).execute()
                if response.data:
                    return {"success": True, "data": response.data[0]}
            
        # If we reached here, we need to insert a new record
        # But first, ensure we don't insert None for optional fields if not provided
        
        filtered_data = {k: v for k, v in encounter_data.items() if v is not None}
        response = supabase.table("encounters").insert(filtered_data).execute()
            
        if response.data:
            return {"success": True, "data": response.data[0]}
        else:
            return {"success": False, "error": "No data returned from database"}
            
    except Exception as e:
        print(f"[ERROR] Error upserting encounter: {e}")
        return {"success": False, "error": str(e)}