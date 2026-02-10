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


def validate_uuid(value: str) -> bool:
    """Check if a string is a valid UUID"""
    if not value:
        return False
    try:
        import uuid
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError):
        return False


def upsert_encounter(encounter_data: dict):
    """
    Insert or update an encounter record in the database.
    This is used to persist finalized SOAP notes and ICD codes.
    """
    if not supabase:
        print("[ERROR] Cannot upsert encounter: Supabase not configured")
        return {"success": False, "error": "Database not configured"}
    
    try:
        # Validate and clean doctor_id - must be a valid UUID or None
        if encounter_data.get("doctor_id"):
            if not validate_uuid(encounter_data["doctor_id"]):
                print(f"[WARNING] Invalid doctor_id UUID: {encounter_data['doctor_id']}, setting to None")
                encounter_data["doctor_id"] = None
        
        # Validate and clean intake_session_id - must be a valid UUID or None
        if encounter_data.get("intake_session_id"):
            if not validate_uuid(encounter_data["intake_session_id"]):
                print(f"[WARNING] Invalid intake_session_id UUID: {encounter_data['intake_session_id']}, setting to None")
                encounter_data["intake_session_id"] = None
        
        # If encounter_id is provided, try to update
        if encounter_data.get("id") and validate_uuid(encounter_data.get("id")):
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
        # Remove id if not a valid UUID (let DB generate it)
        if "id" in encounter_data and not validate_uuid(encounter_data.get("id")):
            del encounter_data["id"]
        
        # Filter out None values
        filtered_data = {k: v for k, v in encounter_data.items() if v is not None}
        
        print(f"[DEBUG] Inserting encounter with data: {list(filtered_data.keys())}")
        response = supabase.table("encounters").insert(filtered_data).execute()
            
        if response.data:
            print(f"[SUCCESS] Encounter inserted with ID: {response.data[0].get('id')}")
            return {"success": True, "data": response.data[0]}
        else:
            return {"success": False, "error": "No data returned from database"}
            
    except Exception as e:
        print(f"[ERROR] Error upserting encounter: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


def insert_clinical_note(clinical_note: dict) -> dict:
    """
    Insert a clinical note into the clinical_notes table.
    
    Args:
        clinical_note: Dict containing:
            - patient_id: str
            - raw_text: str (original clinical text)
            - deidentified_text: str (PHI-removed text)
            - subjective: str (SOAP S section)
            - objective: str (SOAP O section)
            - assessment: str (SOAP A section)
            - plan: str (SOAP P section)
            - icd_json: list/dict (ICD codes)
            - embedding: list (vector embedding)
            - encounter_id: str (UUID reference to encounters table)
            - validation_score: float
            - speciality: str
    
    Returns:
        dict with success status and inserted data or error
    """
    if not supabase:
        print("[ERROR] Cannot insert clinical note: Supabase not configured")
        return {"success": False, "error": "Database not configured"}
    
    try:
        # Prepare data for insertion
        data = {
            "patient_id": clinical_note.get("patient_id"),
            "raw_text": clinical_note.get("raw_text"),
            "deidentified_text": clinical_note.get("deidentified_text"),
            "subjective": clinical_note.get("subjective"),
            "objective": clinical_note.get("objective"),
            "assessment": clinical_note.get("assessment"),
            "plan": clinical_note.get("plan"),
            "icd_json": json.dumps(clinical_note.get("icd_json") or []) if clinical_note.get("icd_json") else None,
            "embedding": clinical_note.get("embedding") if clinical_note.get("embedding") else None,
            "encounter_id": clinical_note.get("encounter_id"),
            "validation_score": clinical_note.get("validation_score"),
            "speciality": clinical_note.get("speciality"),
        }
        
        # Remove None values to avoid inserting nulls for optional fields
        filtered_data = {k: v for k, v in data.items() if v is not None}
        
        result = supabase.table("clinical_notes").insert(filtered_data).execute()
        
        if result.data:
            print(f"[SUCCESS] Clinical note inserted for patient {clinical_note.get('patient_id')}")
            return {"success": True, "data": result.data[0]}
        else:
            return {"success": False, "error": "No data returned from database"}
            
    except Exception as e:
        print(f"[ERROR] Error inserting clinical note: {e}")
        return {"success": False, "error": str(e)}


def fetch_similar_clinical_notes(query_embedding: list, top_k: int = 5) -> list:
    """
    Fetch similar clinical notes using vector similarity search.
    Uses the match_clinical_notes RPC function if available.
    
    Args:
        query_embedding: Vector embedding of the query text
        top_k: Number of similar notes to return
    
    Returns:
        List of similar clinical notes
    """
    if not supabase:
        print("[ERROR] Cannot fetch clinical notes: Supabase not configured")
        return []
    
    try:
        # Try using the match_clinical_notes RPC function
        try:
            result = supabase.rpc(
                "match_clinical_notes",
                {
                    "query_embedding": list(query_embedding),
                    "match_count": top_k
                }
            ).execute()
            if result.data:
                return result.data
        except Exception as rpc_error:
            print(f"[WARNING] RPC function not available: {rpc_error}")
        
        # Fallback: Get most recent clinical notes
        result = supabase.table("clinical_notes").select("*").order("id", desc=True).limit(top_k).execute()
        return result.data if result.data else []
        
    except Exception as e:
        print(f"[ERROR] Error fetching similar clinical notes: {e}")
        return []


def get_clinical_notes_by_patient(patient_id: str) -> list:
    """
    Fetch all clinical notes for a specific patient.
    
    Args:
        patient_id: Patient identifier
    
    Returns:
        List of clinical notes for the patient
    """
    if not supabase:
        print("[ERROR] Cannot fetch clinical notes: Supabase not configured")
        return []
    
    try:
        result = supabase.table("clinical_notes").select("*").eq("patient_id", patient_id).order("id", desc=True).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"[ERROR] Error fetching clinical notes for patient {patient_id}: {e}")
        return []


def get_clinical_notes_by_encounter(encounter_id: str) -> dict:
    """
    Fetch clinical note for a specific encounter.
    
    Args:
        encounter_id: Encounter UUID
    
    Returns:
        Clinical note dict or None
    """
    if not supabase:
        print("[ERROR] Cannot fetch clinical note: Supabase not configured")
        return None
    
    try:
        result = supabase.table("clinical_notes").select("*").eq("encounter_id", encounter_id).single().execute()
        return result.data
    except Exception as e:
        print(f"[ERROR] Error fetching clinical note for encounter {encounter_id}: {e}")
        return None