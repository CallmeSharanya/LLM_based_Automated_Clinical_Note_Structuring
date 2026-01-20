"""
Clinical EHR System - Main API
Complete Hospital Management with AI-powered SOAP Structuring
"""

import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import traceback
from datetime import datetime
import uuid

# Import utilities
from ocr_utils import extract_text_from_bytes
from utils import deidentify_text
from llm_structurer import embed_with_gemini
from icd_mapper import load_icd_codes, match_icd
from db_utils import insert_note, fetch_similar_notes, get_all_notes

# Import agents
from agents.custom_orchestrator import orchestrator, run_full_pipeline_custom
from agents.intake_triage_agent import intake_agent, IntakeSession
from agents.doctor_matching_agent import doctor_matching_agent
from agents.dual_validator_agent import dual_validator
from agents.patient_summary_agent import patient_summary_agent
from agents.reflexion_agent import reflexion_agent

# Import auth
from auth import (
    auth_manager, 
    LoginRequest, 
    PatientSignupRequest, 
    QuickSignupRequest,
    ProfileUpdateRequest
)

import google.generativeai as genai

# Configure
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

app = FastAPI(
    title="Clinical EHR Hospital Management System",
    description="AI-powered clinical documentation with patient intake, doctor matching, and SOAP structuring",
    version="3.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ICD codes
ICD_PATH = os.getenv("ICD_PATH", "data/icd10.csv")
try:
    icd_codes = load_icd_codes(ICD_PATH)
except Exception as e:
    print(f"⚠️ Could not load ICD codes: {e}")
    icd_codes = []

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ChatMessage(BaseModel):
    session_id: str
    message: str
    patient_id: Optional[str] = None

class DoctorMatchRequest(BaseModel):
    symptoms: List[str]
    preliminary_soap: Optional[Dict[str, str]] = None
    triage_priority: str = "green"
    preferred_language: Optional[str] = None

class DoctorAssignRequest(BaseModel):
    session_id: str
    doctor_id: str
    slot: str

class EncounterUpdate(BaseModel):
    encounter_id: str
    doctor_notes: Optional[str] = None
    vitals: Optional[Dict[str, Any]] = None
    examination: Optional[Dict[str, Any]] = None
    edited_soap: Optional[Dict[str, str]] = None
    diagnoses: Optional[List[str]] = None

class ValidateSOAPRequest(BaseModel):
    soap_note: Dict[str, str]
    source_conversation: Optional[List[Dict]] = None
    extracted_symptoms: Optional[List[str]] = None
    specialty: Optional[str] = None

class PatientSummaryRequest(BaseModel):
    soap_note: Dict[str, str]
    diagnoses: Optional[List[str]] = None
    medications: Optional[List[Dict]] = None
    follow_up_date: Optional[str] = None
    patient_name: Optional[str] = "Patient"
    doctor_name: Optional[str] = "Your doctor"

class LoadDoctorsRequest(BaseModel):
    doctors: List[Dict[str, Any]]

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "3.0.0",
        "features": [
            "patient_intake",
            "triage",
            "doctor_matching",
            "soap_structuring",
            "dual_validation",
            "patient_summary",
            "reflexion_learning",
            "multi_role_auth"
        ]
    }

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/auth/login")
async def login(request: LoginRequest):
    """Login for patients, doctors, and hospital admins"""
    return auth_manager.login(request.email, request.password, request.role)

@app.post("/auth/signup")
async def signup(request: PatientSignupRequest):
    """Patient registration"""
    return auth_manager.signup(request)

@app.post("/auth/quick-signup")
async def quick_signup(request: QuickSignupRequest):
    """Quick registration for emergency patients"""
    return auth_manager.quick_signup(request)

@app.get("/auth/me")
async def get_current_user(authorization: str = Header(None)):
    """Get current authenticated user"""
    user = auth_manager.get_current_user(authorization)
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "phone": user.phone,
        **user.profile,
    }

@app.put("/auth/profile")
async def update_profile(
    request: ProfileUpdateRequest,
    authorization: str = Header(None)
):
    """Update user profile"""
    user = auth_manager.get_current_user(authorization)
    return auth_manager.update_profile(user.id, request)

@app.post("/auth/logout")
async def logout(authorization: str = Header(None)):
    """Logout user"""
    if authorization:
        parts = authorization.split()
        if len(parts) == 2:
            return auth_manager.logout(parts[1])
    return {"success": True, "message": "Logged out"}

# ============================================================================
# PATIENT INTAKE ENDPOINTS
# ============================================================================

@app.post("/intake/start")
async def start_intake(patient_id: Optional[str] = Form(None)):
    """Start a new patient intake session"""
    session_id = str(uuid.uuid4())
    
    session = intake_agent.create_session(session_id, patient_id)
    greeting = intake_agent.get_greeting_message()
    
    return {
        "session_id": session_id,
        "patient_id": patient_id,
        "message": greeting,
        "stage": "greeting"
    }

@app.post("/intake/message")
async def intake_message(request: ChatMessage):
    """Process a message in the intake conversation"""
    
    session = intake_agent.get_session(request.session_id)
    
    if not session:
        # Create new session if not exists
        session = intake_agent.create_session(request.session_id, request.patient_id)
        greeting = intake_agent.get_greeting_message()
        return {
            "session_id": request.session_id,
            "message": greeting,
            "stage": "greeting",
            "new_session": True
        }
    
    # Process message
    result = intake_agent.process_message(request.session_id, request.message)
    
    return {
        "session_id": request.session_id,
        "message": result.get("response", ""),
        "stage": result.get("stage", "unknown"),
        "is_emergency": result.get("is_emergency", False),
        "session_complete": result.get("session_complete", False),
        "triage": result.get("triage"),
        "preliminary_soap": result.get("preliminary_soap"),
        "suggested_specialties": result.get("suggested_specialties", [])
    }

@app.get("/intake/session/{session_id}")
async def get_intake_session(session_id: str):
    """Get current state of intake session"""
    
    summary = intake_agent.get_session_summary(session_id)
    
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    
    return summary

@app.get("/intake/sessions")
async def list_intake_sessions():
    """List all active intake sessions"""
    
    sessions = []
    for session_id, session in intake_agent.sessions.items():
        sessions.append({
            "session_id": session_id,
            "patient_id": session.patient_id,
            "stage": session.current_stage,
            "triage_priority": session.triage_priority.value if session.triage_priority else None,
            "created_at": session.created_at.isoformat()
        })
    
    return {"sessions": sessions, "count": len(sessions)}

# ============================================================================
# DOCTOR MATCHING ENDPOINTS
# ============================================================================

@app.post("/doctors/load")
async def load_doctors(request: LoadDoctorsRequest):
    """Load doctors into the matching system"""
    
    doctor_matching_agent.load_doctors_from_db(request.doctors)
    
    return {
        "message": f"Loaded {len(request.doctors)} doctors",
        "count": len(request.doctors)
    }

@app.post("/doctors/match")
async def match_doctor(request: DoctorMatchRequest):
    """Find matching doctors for a patient"""
    
    result = doctor_matching_agent.get_best_match(
        symptoms=request.symptoms,
        preliminary_soap=request.preliminary_soap,
        triage_priority=request.triage_priority,
        preferred_language=request.preferred_language
    )
    
    return result

@app.post("/doctors/assign")
async def assign_doctor(request: DoctorAssignRequest):
    """Assign a doctor to a patient session"""
    
    session_summary = intake_agent.get_session_summary(request.session_id)
    
    if "error" in session_summary:
        raise HTTPException(status_code=404, detail="Session not found")
    
    result = doctor_matching_agent.assign_doctor(
        session_data=session_summary,
        selected_doctor_id=request.doctor_id,
        selected_slot=request.slot
    )
    
    return result

@app.get("/doctors/specialties")
async def get_specialties():
    """Get available specialties"""
    
    specialties = set()
    for doc in doctor_matching_agent.doctors_cache:
        specialties.add(doc.specialty)
        if doc.subspecialty:
            specialties.add(doc.subspecialty)
    
    return {"specialties": sorted(list(specialties))}

# ============================================================================
# SOAP PROCESSING ENDPOINTS
# ============================================================================

@app.post("/process_note/")
async def process_note(
    file: UploadFile = File(...),
    patient_id: str = Form(None),
    specialty: str = Form(None),
    validate: bool = Form(True)
):
    """
    Process a clinical note file and structure it into SOAP format.
    Includes dual validation if enabled.
    """
    try:
        file_bytes = await file.read()
        raw_text = extract_text_from_bytes(file_bytes, file.filename)
        
        if not raw_text.strip():
            return JSONResponse(
                {"error": "No readable text extracted from file."},
                status_code=400
            )

        # De-identify the text
        deid = deidentify_text(raw_text)

        # Use custom orchestrator for SOAP extraction
        result = orchestrator.process_note(deid)
        soap = result.get("soap", {})

        # Ensure all SOAP fields exist
        soap = {
            "Subjective": soap.get("Subjective", ""),
            "Objective": soap.get("Objective", ""),
            "Assessment": soap.get("Assessment", ""),
            "Plan": soap.get("Plan", ""),
        }

        # Dual validation if enabled
        validation_result = None
        if validate:
            validation = dual_validator.validate_soap(
                soap_note=soap,
                extracted_symptoms=result.get("entities", {}).get("symptoms", []),
                specialty=specialty
            )
            validation_result = dual_validator.get_validation_summary(validation)

        # Match ICD codes
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
            "validation": validation_result,
            "message": "✅ Note processed with dual validation!",
        })

    except Exception as e:
        print("❌ Error in /process_note/:", e)
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# VALIDATION ENDPOINTS
# ============================================================================

@app.post("/validate/soap")
async def validate_soap(request: ValidateSOAPRequest):
    """Validate a SOAP note using dual-level validation"""
    
    validation = dual_validator.validate_soap(
        soap_note=request.soap_note,
        source_conversation=request.source_conversation,
        extracted_symptoms=request.extracted_symptoms,
        specialty=request.specialty
    )
    
    return dual_validator.get_validation_summary(validation)

# ============================================================================
# PATIENT SUMMARY ENDPOINTS
# ============================================================================

@app.post("/summary/generate")
async def generate_patient_summary(request: PatientSummaryRequest):
    """Generate a patient-friendly summary"""
    
    summary = patient_summary_agent.generate_patient_summary(
        soap_note=request.soap_note,
        diagnoses=request.diagnoses,
        medications=request.medications,
        follow_up_date=request.follow_up_date,
        patient_name=request.patient_name,
        doctor_name=request.doctor_name
    )
    
    return {
        "summary": summary,
        "formatted_text": patient_summary_agent.format_for_display(summary),
        "formatted_html": patient_summary_agent.format_for_html(summary)
    }

@app.post("/summary/sms")
async def generate_sms_summary(
    soap_note: Dict[str, str],
    patient_name: str = "Patient"
):
    """Generate a brief SMS-friendly summary"""
    
    sms = patient_summary_agent.generate_sms_summary(soap_note, patient_name)
    
    return {
        "sms": sms,
        "length": len(sms)
    }

# ============================================================================
# DOCTOR ENCOUNTER ENDPOINTS
# ============================================================================

@app.post("/encounter/update")
async def update_encounter(request: EncounterUpdate):
    """Update encounter with doctor's edits"""
    
    # If there's an edited SOAP, log it for learning
    if request.edited_soap:
        # Get original SOAP from session (in real impl, from DB)
        # For now, we'll simulate
        original_soap = {
            "Subjective": "",
            "Objective": "",
            "Assessment": "",
            "Plan": ""
        }
        
        # Log the edit for learning
        edit_log = reflexion_agent.log_edit(
            encounter_id=request.encounter_id,
            doctor_id="doctor_1",  # Would come from auth
            specialty="General Medicine",  # Would come from doctor profile
            original_soap=original_soap,
            edited_soap=request.edited_soap
        )
        
        # Validate the edited SOAP
        validation = dual_validator.validate_soap(request.edited_soap)
        validation_summary = dual_validator.get_validation_summary(validation)
        
        return {
            "message": "Encounter updated",
            "encounter_id": request.encounter_id,
            "validation": validation_summary,
            "edit_logged": True,
            "edit_category": edit_log.edit_category,
            "edit_severity": edit_log.edit_severity
        }
    
    return {
        "message": "Encounter updated",
        "encounter_id": request.encounter_id
    }

@app.post("/encounter/finalize")
async def finalize_encounter(
    encounter_id: str = Form(...),
    final_soap: str = Form(...),  # JSON string
    generate_patient_summary: bool = Form(True)
):
    """Finalize encounter and generate patient summary"""
    
    try:
        soap = json.loads(final_soap)
    except:
        raise HTTPException(status_code=400, detail="Invalid SOAP JSON")
    
    # Validate final SOAP
    validation = dual_validator.validate_soap(soap)
    
    if not validation.is_valid:
        return {
            "warning": "SOAP note has validation issues",
            "validation": dual_validator.get_validation_summary(validation),
            "finalized": False
        }
    
    result = {
        "message": "Encounter finalized",
        "encounter_id": encounter_id,
        "validation": dual_validator.get_validation_summary(validation),
        "finalized": True
    }
    
    # Generate patient summary if requested
    if generate_patient_summary:
        summary = patient_summary_agent.generate_patient_summary(soap)
        result["patient_summary"] = summary
        result["patient_summary_html"] = patient_summary_agent.format_for_html(summary)
    
    return result

# ============================================================================
# LEARNING & ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/learning/metrics")
async def get_learning_metrics(specialty: Optional[str] = None):
    """Get learning performance metrics"""
    return reflexion_agent.get_performance_metrics(specialty)

@app.get("/learning/patterns")
async def get_learning_patterns(specialty: Optional[str] = None):
    """Analyze edit patterns"""
    return reflexion_agent.analyze_patterns(specialty)

@app.get("/learning/insights")
async def get_learning_insights(specialty: Optional[str] = None):
    """Get AI-generated insights from edit patterns"""
    insights = reflexion_agent.generate_insights(specialty)
    return {
        "insights": [
            {
                "category": i.category,
                "insight": i.insight,
                "frequency": i.frequency,
                "confidence": i.confidence,
                "suggested_update": i.suggested_prompt_update
            }
            for i in insights
        ]
    }

@app.get("/learning/improvements")
async def get_prompt_improvements(specialty: Optional[str] = None):
    """Get suggested prompt improvements"""
    return reflexion_agent.get_prompt_improvements(specialty)

@app.get("/learning/export")
async def export_learning_data():
    """Export all learning data"""
    return reflexion_agent.export_learning_data()

# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

@app.post("/chat")
async def chat(query: str = Form(...)):
    """Answer clinical queries using RAG with similar notes"""
    try:
        query_emb = embed_with_gemini(query)
        similar_notes = fetch_similar_notes(query_emb, top_k=3)
        
        if not similar_notes:
            return {"answer": "No similar notes found in database.", "similar_notes": []}

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

# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/analytics/run")
def run_analytics():
    """Run analytics pipeline"""
    try:
        result = run_full_pipeline_custom()
        return {
            "message": "Analytics complete",
            "result": result
        }
    except Exception as e:
        print("❌ Error in /analytics/run:", e)
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/analytics/icd")
def get_icd_stats():
    """Get ICD code statistics"""
    notes = get_all_notes()
    if not notes:
        return {"message": "No notes available", "stats": {}}
    
    result = orchestrator.get_analytics(notes)
    return result.get("icd_stats", {})

# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    print("🏥 Clinical EHR System Starting...")
    print("✅ Patient Intake Agent Ready")
    print("✅ Doctor Matching Agent Ready")
    print("✅ Dual Validator Ready")
    print("✅ Patient Summary Agent Ready")
    print("✅ Reflexion Learning Agent Ready")
    
    # Load sample doctors for demo
    sample_doctors = [
        {
            "id": "doc-001",
            "name": "Dr. Priya Sharma",
            "specialty": "Cardiology",
            "subspecialty": "Interventional Cardiology",
            "qualifications": ["MBBS", "MD", "DM Cardiology"],
            "languages": ["English", "Hindi", "Kannada"],
            "experience_years": 15,
            "current_load": 5,
            "max_load": 20,
            "consultation_fee": 1000,
            "is_available": True,
            "is_online": True,
            "rating": 4.8
        },
        {
            "id": "doc-002",
            "name": "Dr. Rajesh Kumar",
            "specialty": "Orthopedics",
            "subspecialty": "Sports Medicine",
            "qualifications": ["MBBS", "MS Ortho"],
            "languages": ["English", "Hindi"],
            "experience_years": 12,
            "current_load": 8,
            "max_load": 20,
            "consultation_fee": 800,
            "is_available": True,
            "is_online": False,
            "rating": 4.6
        },
        {
            "id": "doc-003",
            "name": "Dr. Ananya Patel",
            "specialty": "General Medicine",
            "subspecialty": None,
            "qualifications": ["MBBS", "MD Medicine"],
            "languages": ["English", "Hindi", "Gujarati"],
            "experience_years": 8,
            "current_load": 3,
            "max_load": 25,
            "consultation_fee": 500,
            "is_available": True,
            "is_online": True,
            "rating": 4.7
        },
        {
            "id": "doc-004",
            "name": "Dr. Mohammed Ali",
            "specialty": "Pulmonology",
            "subspecialty": "Critical Care",
            "qualifications": ["MBBS", "MD Pulmonology"],
            "languages": ["English", "Hindi", "Urdu"],
            "experience_years": 10,
            "current_load": 6,
            "max_load": 15,
            "consultation_fee": 900,
            "is_available": True,
            "is_online": True,
            "rating": 4.9
        },
        {
            "id": "doc-005",
            "name": "Dr. Sneha Reddy",
            "specialty": "Neurology",
            "subspecialty": "Stroke Medicine",
            "qualifications": ["MBBS", "DM Neurology"],
            "languages": ["English", "Telugu", "Hindi"],
            "experience_years": 9,
            "current_load": 4,
            "max_load": 18,
            "consultation_fee": 950,
            "is_available": True,
            "is_online": False,
            "rating": 4.7
        }
    ]
    
    doctor_matching_agent.load_doctors_from_db(sample_doctors)
    print(f"✅ Loaded {len(sample_doctors)} sample doctors")
    
    print("🚀 System Ready!")
