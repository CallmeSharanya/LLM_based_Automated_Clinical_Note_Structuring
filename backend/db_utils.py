import os
from supabase import create_client, Client
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL  = os.environ.get("SUPABASE_URL")
SUPABASE_KEY  = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY )

def insert_note(note:dict):
    data = {
        "patient_id": note.get("patient_id"),
        "raw_text": note.get("raw_text"),
        "deidentified_text": note.get("deidentified_text"),
        "subjective": note.get("subjective"),
        "objective": note.get("objective"),
        "assessment": note.get("assessment"),
        "plan": note.get("plan"),
        "icd_json": json.dumps(note.get("icd_json") or []),
        "embedding": note.get("embedding"),
    }

    result = supabase.table("clinical_notes").insert(data).execute()
    return result.data[0] if result.data else None

# def fetch_similar_notes (query_embedding, top_k = 3):
#     sql = f""" SELECT id, patient_id, assessment, plan, subjective, objective, 1-(embedding <=> '{query_embedding}::vector') AS similarity FROM clinical_notes ORDER BY embedding <=> '{query_embedding}::vector' LIMIT {top_k}; """
#     response= supabase.postgrest.rpc("execute_sql", {"query": sql}).execute()
#     if response.data:
#         return response.data
#     return []

# def fetch_similar_notes(query_embedding, top_k=3):
#     res = supabase.rpc("match_notes", {"query_embedding": query_embedding, "match_count": top_k}).execute()
#     return res.data or []

def fetch_similar_notes(query_emb, top_k=3):
    # Convert numpy list to Postgres vector string
    query_vector = str(list(query_emb))
    sql = f"""
    select *, 1 - (embedding <#> '{query_vector}') as similarity
    from clinical_notes
    order by similarity desc
    limit {top_k};
    """
    result = supabase.rpc("sql", {"query": sql}).execute()
    return result.data if result.data else []