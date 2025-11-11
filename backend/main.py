import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from ocr_utils import extract_text_from_bytes
from utils import deidentify_text
from llm_structurer import structure_with_gemini, embed_with_gemini
from icd_mapper import load_icd_codes, match_icd
from db_utils import insert_note, fetch_similar_notes
import json
import google.generativeai as genai
import traceback
from agents.crew_setup import run_full_pipeline
import os
os.environ["CREWAI_DEFAULT_LLM_PROVIDER"] = "none"
os.environ.pop("OPENAI_API_KEY", None)

load_dotenv()
app=FastAPI(title="Clinical Structurer (Gemini+Supabase)")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


genai.configure(api_key=os.getenv("GOOGLE_API_KEY" ))
ICD_PATH = os.getenv("ICD_PATH", "data/icd10.csv")
try : 
    icd_codes = load_icd_codes(ICD_PATH)
except Exception as e:
    print(f"⚠️ Could not load ICD codes from {ICD_PATH}: {e}")
    icd_codes = []

@app.post("/process_note/")
async def process_note(file: UploadFile = File(...), patient_id: str = Form(None)):
    try:
        file_bytes = await file.read()
        raw_text = extract_text_from_bytes(file_bytes, file.filename)
        if not raw_text.strip():
            return JSONResponse({"error": "No readable text extracted from file."}, status_code=400)

        deid = deidentify_text(raw_text)

        structure = structure_with_gemini(deid)
        soap = structure.get("SOAP", {})

        soap = {
            "Subjective": soap.get("Subjective", ""),
            "Objective": soap.get("Objective", ""),
            "Assessment": soap.get("Assessment", ""),
            "Plan": soap.get("Plan", ""),
        }

        icd_matches = match_icd(soap.get("Assessment", ""), icd_codes)

        combined = " ".join(soap.values())
        embedding = embed_with_gemini(combined)

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

        return JSONResponse(
            {
                "saved_record": record,
                "soap": soap,
                "icd": icd_matches,
                "message": "✅ Note processed successfully!",
            }
        )

    except Exception as e:
        print("❌ Error in /process_note/:", e)
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/chat")
async def chat (query: str=Form(...)):
    query_emb = embed_with_gemini(query)
    similar_notes = fetch_similar_notes(query_emb, top_k=3)
    if not similar_notes:
        return {"answer": "No similar notes found in database."}

    context = "\n\n".join([
        f"Assessment: {n['assessment']}\nPlan: {n['plan']}" for n in similar_notes
    ])
    prompt = f"""
You are a clinical assistant. Use the context from similar notes to answer the user's query.
Context:
{context}

Question:
{query}

Answer:
"""
    model = genai.GenerativeModel("gemini-2.5-flash")
    resp = model.generate_content(prompt)
    return {"answer": resp.text.strip(), "similar_notes": similar_notes}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/run_agents")
def run_agents():
    result = run_full_pipeline()
    return {"message": "Multi-agent process complete", "result": result}