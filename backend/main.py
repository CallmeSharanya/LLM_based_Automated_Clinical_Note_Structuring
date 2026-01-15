import os
from dotenv import load_dotenv
load_dotenv() # Load environment variables FIRST

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ocr_utils import extract_text_from_bytes
from utils import deidentify_text
from llm_structurer import embed_with_gemini
from icd_mapper import load_icd_codes, match_icd
from db_utils import insert_note, fetch_similar_notes, get_all_notes
import json
import google.generativeai as genai
import traceback

# Import custom orchestrator (replaces CrewAI)
from agents.custom_orchestrator import orchestrator, run_full_pipeline_custom
app = FastAPI(title="Clinical Structurer")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
ICD_PATH = os.getenv("ICD_PATH", "data/icd10.csv")
try:
    icd_codes = load_icd_codes(ICD_PATH)
except Exception as e:
    print(f"⚠️ Could not load ICD codes from {ICD_PATH}: {e}")
    icd_codes = []


@app.post("/process_note/")
async def process_note(file: UploadFile = File(...), patient_id: str = Form(None)):
    """
    Process a clinical note file and structure it into SOAP format.
    Uses custom multi-step agent for improved accuracy.
    """
    try:
        file_bytes = await file.read()
        raw_text = extract_text_from_bytes(file_bytes, file.filename)
        if not raw_text.strip():
            return JSONResponse({"error": "No readable text extracted from file."}, status_code=400)

        # De-identify the text
        deid = deidentify_text(raw_text)

        # Use custom orchestrator for multi-step SOAP extraction
        result = orchestrator.process_note(deid)
        soap = result.get("soap", {})

        # Ensure all SOAP fields exist
        soap = {
            "Subjective": soap.get("Subjective", ""),
            "Objective": soap.get("Objective", ""),
            "Assessment": soap.get("Assessment", ""),
            "Plan": soap.get("Plan", ""),
        }

        # Match ICD codes from assessment
        icd_matches = match_icd(soap.get("Assessment", ""), icd_codes)

        # Generate embedding
        combined = " ".join([v for v in soap.values() if v])
        embedding = embed_with_gemini(combined) if combined.strip() else []

        # Prepare note for database
        note = {
            "patient_id": patient_id or "unknown",
            "raw_text": raw_text,
            "deidentified_text": deid,
            "subjective": soap["Subjective"],
            "objective": soap["Objective"],
            "assessment": soap["Assessment"],
            "plan": soap["Plan"],
            "icd_json": icd_matches,
            "embedding": embedding,
        }

        record = insert_note(note)

        return JSONResponse({
            "saved_record": record,
            "soap": soap,
            "icd": icd_matches,
            "confidence": result.get("confidence", {}),
            "quality": result.get("quality", {}),
            "entities": result.get("entities", {}),
            "flags": result.get("flags", []),
            "message": "✅ Note processed successfully with multi-step extraction!",
        })

    except Exception as e:
        print("❌ Error in /process_note/:", e)
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/chat")
async def chat(query: str = Form(...)):
    """
    Answer clinical queries using RAG with similar notes.
    """
    try:
        query_emb = embed_with_gemini(query)
        similar_notes = fetch_similar_notes(query_emb, top_k=3)
        
        if not similar_notes:
            return {"answer": "No similar notes found in database.", "similar_notes": []}

        # Use custom chat agent
        result = orchestrator.answer_query(query, similar_notes)
        
        return {
            "answer": result.get("answer", "No response generated."),
            "similar_notes": similar_notes,
            "sources_used": result.get("sources_used", 0)
        }
    except Exception as e:
        print("❌ Error in /chat:", e)
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "ok", "version": "2.0-custom-agents"}


@app.get("/run_agents")
def run_agents():
    """
    Run analytics pipeline using custom agents (replaces CrewAI).
    Returns ICD statistics and summary.
    """
    try:
        result = run_full_pipeline_custom()
        return {
            "message": "Multi-agent analytics complete (Custom Orchestrator)",
            "result": result
        }
    except Exception as e:
        print("❌ Error in /run_agents:", e)
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/analytics")
def get_analytics():
    """
    Get comprehensive analytics from all stored notes.
    """
    try:
        notes = get_all_notes()
        result = orchestrator.get_analytics(notes)
        return {
            "total_notes": len(notes),
            "icd_stats": result.get("icd_stats", {}),
            "summary": result.get("summary", "")
        }
    except Exception as e:
        print("❌ Error in /analytics:", e)
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)