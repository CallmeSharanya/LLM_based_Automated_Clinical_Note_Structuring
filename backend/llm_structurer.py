import os
import google.generativeai as genai
import json
from dotenv import load_dotenv
load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

GEMINI_MODEL = "models/gemini-2.5-flash"

def structure_with_gemini(note_text: str) -> dict:
    """
    Structure clinical note into SOAP format using improved multi-context prompting.
    This is a simplified version - for full multi-step extraction, use the custom_orchestrator.
    """
    
    prompt = f"""You are an expert clinical documentation specialist with 20 years of experience.
Your task is to structure the following clinical note into SOAP format with high accuracy.

=== SOAP FORMAT DEFINITIONS ===

**SUBJECTIVE (S)**: Information the PATIENT reports or tells you
- Chief complaint and history of present illness
- Symptoms described by patient (pain, fatigue, nausea, etc.)
- Duration and characteristics of symptoms
- Patient's medical history they mention
- Current medications the patient is taking
- Allergies
- Social history (smoking, alcohol, occupation)
- Family history

**OBJECTIVE (O)**: Information the CLINICIAN observes or measures
- Vital signs (BP, HR, RR, Temp, SpO2, Weight)
- Physical examination findings
- Laboratory results (CBC, BMP, etc.)
- Imaging results (X-ray, CT, MRI findings)
- Other test results (EKG, etc.)

**ASSESSMENT (A)**: Clinical conclusions and diagnoses
- Primary diagnosis
- Differential diagnoses
- Clinical impressions
- Disease staging or severity

**PLAN (P)**: Treatment decisions and next steps
- Medications prescribed (with dosages)
- Procedures ordered or performed
- Tests ordered
- Referrals
- Patient education provided
- Follow-up instructions

=== CRITICAL RULES ===
1. Extract EXACT text from the note - do not paraphrase or summarize
2. Be COMPREHENSIVE - include ALL relevant information
3. If a section has no information, use "Not documented in clinical note"
4. Vitals and lab values MUST go in Objective, never in Subjective
5. What the patient SAYS goes in Subjective; what you OBSERVE goes in Objective
6. Current medications mentioned by patient → Subjective
7. Medications PRESCRIBED → Plan
8. Include specific values (e.g., "BP 140/90 mmHg" not just "elevated BP")

=== CLINICAL NOTE ===
\"\"\"{note_text}\"\"\"

=== OUTPUT FORMAT ===
Return ONLY valid JSON in this exact format:
{{
  "SOAP": {{
    "Subjective": "<comprehensive text with all patient-reported information>",
    "Objective": "<comprehensive text with all clinical findings, vitals, labs>",
    "Assessment": "<diagnosis and clinical impressions>",
    "Plan": "<treatment plan, medications, follow-up>"
  }}
}}

Return ONLY the JSON, no markdown formatting, no explanations."""

    model = genai.GenerativeModel("gemini-2.5-flash")
    response = model.generate_content(prompt)
    text = response.text.strip()

    # Extract JSON from response
    try:
        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            json_str = text[start:end]
            data = json.loads(json_str)
            soap = data.get("SOAP", {})
            return {
                "SOAP": {
                    "Subjective": soap.get("Subjective", "Not documented"),
                    "Objective": soap.get("Objective", "Not documented"),
                    "Assessment": soap.get("Assessment", "Not documented"),
                    "Plan": soap.get("Plan", "Not documented")
                },
                "raw_model_output": text
            }
    except Exception as e:
        print("Error parsing JSON:", e)
        return {
            "SOAP": {
                "Subjective": "",
                "Objective": "",
                "Assessment": "",
                "Plan": ""
            },
            "raw_model_output": text,
            "parse_error": str(e)
        }


def embed_with_gemini(text: str) -> list:
    """Generate embeddings using Gemini's text-embedding model"""
    if not text or not text.strip():
        return []
    
    try:
        embed_model = "text-embedding-004"
        result = genai.embed_content(model=embed_model, content=text)
        return result["embedding"]
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []