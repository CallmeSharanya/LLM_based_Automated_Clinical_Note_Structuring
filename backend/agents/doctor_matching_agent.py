"""
Doctor Matching Agent
Intelligently matches patients to appropriate doctors based on
specialty, availability, workload, and patient preferences
"""

import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

import google.generativeai as genai
import os

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


@dataclass
class Doctor:
    """Represents a doctor in the system"""
    id: str
    name: str
    specialty: str
    subspecialty: Optional[str]
    qualifications: List[str]
    languages: List[str]
    experience_years: int
    current_load: int
    max_load: int
    availability: Dict
    consultation_fee: float
    is_available: bool
    is_online: bool
    rating: float
    
    @property
    def load_percentage(self) -> float:
        return (self.current_load / self.max_load) * 100 if self.max_load > 0 else 100


@dataclass
class MatchResult:
    """Result of doctor matching"""
    doctor: Doctor
    match_score: float
    match_reasons: List[str]
    available_slots: List[str]
    estimated_wait_time: str


class DoctorMatchingAgent:
    """
    Agent for matching patients to appropriate doctors.
    Uses specialty mapping, availability, and intelligent scoring.
    """
    
    # Specialty mapping from symptoms/conditions
    SPECIALTY_MAPPING = {
        # Cardiology
        "chest pain": "Cardiology",
        "heart": "Cardiology",
        "palpitations": "Cardiology",
        "blood pressure": "Cardiology",
        "hypertension": "Cardiology",
        
        # Pulmonology
        "breathing": "Pulmonology",
        "cough": "Pulmonology",
        "asthma": "Pulmonology",
        "wheezing": "Pulmonology",
        "shortness of breath": "Pulmonology",
        
        # Neurology
        "headache": "Neurology",
        "migraine": "Neurology",
        "seizure": "Neurology",
        "numbness": "Neurology",
        "dizziness": "Neurology",
        "stroke": "Neurology",
        
        # Orthopedics
        "joint pain": "Orthopedics",
        "back pain": "Orthopedics",
        "fracture": "Orthopedics",
        "spine": "Orthopedics",
        "knee": "Orthopedics",
        "shoulder": "Orthopedics",
        
        # Gastroenterology
        "stomach": "Gastroenterology",
        "abdominal pain": "Gastroenterology",
        "nausea": "Gastroenterology",
        "vomiting": "Gastroenterology",
        "diarrhea": "Gastroenterology",
        "liver": "Gastroenterology",
        
        # Dermatology
        "skin": "Dermatology",
        "rash": "Dermatology",
        "acne": "Dermatology",
        "itching": "Dermatology",
        
        # Endocrinology
        "diabetes": "Endocrinology",
        "thyroid": "Endocrinology",
        "hormone": "Endocrinology",
        
        # Psychiatry
        "depression": "Psychiatry",
        "anxiety": "Psychiatry",
        "stress": "Psychiatry",
        "mental": "Psychiatry",
        "sleep": "Psychiatry",
        
        # General
        "fever": "General Medicine",
        "cold": "General Medicine",
        "flu": "General Medicine",
        "fatigue": "General Medicine",
    }
    
    def __init__(self, model: str = "gemini-2.0-flash"):
        self.model = genai.GenerativeModel(model)
        self.doctors_cache: List[Doctor] = []
    
    def load_doctors_from_db(self, doctors_data: List[Dict]) -> None:
        """Load doctors from database records"""
        self.doctors_cache = []
        for doc in doctors_data:
            self.doctors_cache.append(Doctor(
                id=doc.get("id", ""),
                name=doc.get("name", ""),
                specialty=doc.get("specialty", "General Medicine"),
                subspecialty=doc.get("subspecialty"),
                qualifications=doc.get("qualifications", []),
                languages=doc.get("languages", ["English"]),
                experience_years=doc.get("experience_years", 0),
                current_load=doc.get("current_load", 0),
                max_load=doc.get("max_load", 20),
                availability=doc.get("availability", {}),
                consultation_fee=doc.get("consultation_fee", 500),
                is_available=doc.get("is_available", True),
                is_online=doc.get("is_online", False),
                rating=doc.get("rating", 4.0)
            ))
    
    def _generate_response(self, prompt: str) -> str:
        """Generate response using Gemini"""
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Error generating response: {e}")
            return "{}"
    
    def determine_specialty(self, symptoms: List[str], preliminary_soap: Dict = None) -> List[str]:
        """Determine appropriate medical specialty from symptoms"""
        
        # First, try simple keyword matching
        matched_specialties = []
        symptoms_text = " ".join(symptoms).lower()
        
        for keyword, specialty in self.SPECIALTY_MAPPING.items():
            if keyword in symptoms_text:
                if specialty not in matched_specialties:
                    matched_specialties.append(specialty)
        
        # If no matches or need refinement, use LLM
        if not matched_specialties or len(matched_specialties) > 2:
            soap_text = json.dumps(preliminary_soap) if preliminary_soap else "Not available"
            
            specialty_prompt = f"""Based on the patient's symptoms and preliminary assessment, determine the most appropriate medical specialty.

SYMPTOMS: {symptoms}
PRELIMINARY SOAP: {soap_text}

Consider these specialties:
- Cardiology (heart, blood pressure, chest issues)
- Pulmonology (breathing, lungs, respiratory)
- Neurology (brain, nerves, headaches, dizziness)
- Orthopedics (bones, joints, muscles, spine)
- Gastroenterology (stomach, digestive, liver)
- Dermatology (skin conditions)
- Endocrinology (hormones, diabetes, thyroid)
- Psychiatry (mental health, anxiety, depression)
- General Medicine (general symptoms, fever, infections)
- Emergency Medicine (life-threatening conditions)

Return as JSON:
{{
  "primary_specialty": "Most appropriate specialty",
  "secondary_specialty": "Alternative specialty if applicable",
  "reasoning": "Brief explanation",
  "urgency_level": "routine|same-day|urgent|emergency"
}}

Return ONLY valid JSON."""

            result = self._generate_response(specialty_prompt)
            
            try:
                parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
                matched_specialties = [
                    parsed.get("primary_specialty", "General Medicine")
                ]
                if parsed.get("secondary_specialty"):
                    matched_specialties.append(parsed["secondary_specialty"])
            except:
                matched_specialties = ["General Medicine"]
        
        return matched_specialties[:2]  # Return max 2 specialties
    
    def find_matching_doctors(
        self, 
        required_specialty: str,
        triage_priority: str = "green",
        preferred_language: str = None,
        preferred_time: str = None,
        max_results: int = 5
    ) -> List[MatchResult]:
        """Find and rank doctors matching the criteria"""
        
        matching_doctors = []
        
        for doctor in self.doctors_cache:
            # Skip unavailable doctors
            if not doctor.is_available:
                continue
            
            # Skip if at max capacity (unless emergency)
            if doctor.current_load >= doctor.max_load and triage_priority != "red":
                continue
            
            # Calculate match score
            score = 0.0
            reasons = []
            
            # Specialty match (40%)
            if doctor.specialty.lower() == required_specialty.lower():
                score += 40
                reasons.append(f"Specialty match: {doctor.specialty}")
            elif doctor.subspecialty and required_specialty.lower() in doctor.subspecialty.lower():
                score += 35
                reasons.append(f"Subspecialty match: {doctor.subspecialty}")
            else:
                continue  # Skip non-matching specialty
            
            # Availability/Load (25%)
            load_score = 25 * (1 - (doctor.current_load / doctor.max_load))
            score += load_score
            if doctor.load_percentage < 50:
                reasons.append("Low current workload")
            
            # Experience (15%)
            exp_score = min(15, doctor.experience_years)
            score += exp_score
            if doctor.experience_years >= 10:
                reasons.append(f"Highly experienced ({doctor.experience_years} years)")
            
            # Rating (10%)
            rating_score = (doctor.rating / 5.0) * 10
            score += rating_score
            if doctor.rating >= 4.5:
                reasons.append(f"Excellent rating ({doctor.rating}⭐)")
            
            # Language match (5%)
            if preferred_language and preferred_language in doctor.languages:
                score += 5
                reasons.append(f"Speaks {preferred_language}")
            
            # Online availability (5%)
            if doctor.is_online:
                score += 5
                reasons.append("Currently online")
            
            # Get available slots
            slots = self._get_available_slots(doctor, triage_priority)
            
            # Estimate wait time
            wait_time = self._estimate_wait_time(doctor, triage_priority)
            
            matching_doctors.append(MatchResult(
                doctor=doctor,
                match_score=round(score, 1),
                match_reasons=reasons,
                available_slots=slots,
                estimated_wait_time=wait_time
            ))
        
        # Sort by score (descending)
        matching_doctors.sort(key=lambda x: x.match_score, reverse=True)
        
        return matching_doctors[:max_results]
    
    def _get_available_slots(self, doctor: Doctor, triage_priority: str) -> List[str]:
        """Get available appointment slots for a doctor"""
        
        # Simulate slot generation based on availability
        slots = []
        now = datetime.now()
        
        if triage_priority == "red":
            # Emergency - immediate
            slots.append("Immediate")
            slots.append(f"Within 15 minutes")
        
        elif triage_priority == "orange":
            # Urgent - today
            for hour in range(now.hour + 1, 18):
                slots.append(f"Today at {hour}:00")
                if len(slots) >= 3:
                    break
        
        elif triage_priority == "yellow":
            # Semi-urgent - today or tomorrow
            for hour in range(now.hour + 2, 18):
                slots.append(f"Today at {hour}:00")
                if len(slots) >= 2:
                    break
            tomorrow = now + timedelta(days=1)
            slots.append(f"Tomorrow at 09:00")
            slots.append(f"Tomorrow at 11:00")
        
        else:
            # Routine - next few days
            for i in range(1, 4):
                future_date = now + timedelta(days=i)
                day_name = future_date.strftime("%A")
                slots.append(f"{day_name} at 10:00")
                slots.append(f"{day_name} at 14:00")
        
        return slots[:5]
    
    def _estimate_wait_time(self, doctor: Doctor, triage_priority: str) -> str:
        """Estimate wait time for appointment"""
        
        if triage_priority == "red":
            return "Immediate"
        
        base_wait = doctor.current_load * 15  # 15 mins per patient
        
        if triage_priority == "orange":
            return f"~{max(15, base_wait // 2)} minutes"
        elif triage_priority == "yellow":
            hours = max(1, base_wait // 60)
            return f"~{hours} hour(s)"
        else:
            days = max(1, doctor.current_load // 10)
            return f"~{days} day(s)"
    
    def get_best_match(
        self,
        symptoms: List[str],
        preliminary_soap: Dict = None,
        triage_priority: str = "green",
        preferred_language: str = None
    ) -> Dict[str, Any]:
        """Get the best doctor match for a patient"""
        
        # Determine specialty
        specialties = self.determine_specialty(symptoms, preliminary_soap)
        primary_specialty = specialties[0] if specialties else "General Medicine"
        
        # Find matching doctors
        matches = self.find_matching_doctors(
            required_specialty=primary_specialty,
            triage_priority=triage_priority,
            preferred_language=preferred_language
        )
        
        if not matches:
            # Try secondary specialty
            if len(specialties) > 1:
                matches = self.find_matching_doctors(
                    required_specialty=specialties[1],
                    triage_priority=triage_priority,
                    preferred_language=preferred_language
                )
            
            # Fallback to General Medicine
            if not matches:
                matches = self.find_matching_doctors(
                    required_specialty="General Medicine",
                    triage_priority=triage_priority,
                    preferred_language=preferred_language
                )
        
        if not matches:
            return {
                "success": False,
                "message": "No available doctors found. Please try again later.",
                "suggested_specialty": primary_specialty
            }
        
        best_match = matches[0]
        
        return {
            "success": True,
            "recommended_doctor": {
                "id": best_match.doctor.id,
                "name": best_match.doctor.name,
                "specialty": best_match.doctor.specialty,
                "subspecialty": best_match.doctor.subspecialty,
                "qualifications": best_match.doctor.qualifications,
                "experience_years": best_match.doctor.experience_years,
                "rating": best_match.doctor.rating,
                "consultation_fee": best_match.doctor.consultation_fee,
                "languages": best_match.doctor.languages,
                "is_online": best_match.doctor.is_online
            },
            "match_score": best_match.match_score,
            "match_reasons": best_match.match_reasons,
            "available_slots": best_match.available_slots,
            "estimated_wait_time": best_match.estimated_wait_time,
            "alternative_doctors": [
                {
                    "id": m.doctor.id,
                    "name": m.doctor.name,
                    "specialty": m.doctor.specialty,
                    "rating": m.doctor.rating,
                    "match_score": m.match_score,
                    "available_slots": m.available_slots[:2]
                }
                for m in matches[1:4]
            ],
            "matched_specialty": primary_specialty,
            "alternative_specialty": specialties[1] if len(specialties) > 1 else None
        }
    
    def assign_doctor(
        self,
        session_data: Dict,
        selected_doctor_id: str,
        selected_slot: str
    ) -> Dict[str, Any]:
        """Finalize doctor assignment for a patient session"""
        
        # Find the doctor
        doctor = next(
            (d for d in self.doctors_cache if d.id == selected_doctor_id),
            None
        )
        
        if not doctor:
            return {
                "success": False,
                "message": "Selected doctor not found"
            }
        
        # Generate assignment reasoning
        reasoning_prompt = f"""Generate a brief clinical reasoning for this doctor assignment.

PATIENT INFO:
- Symptoms: {session_data.get('symptoms', [])}
- Triage Priority: {session_data.get('triage_priority', 'unknown')}

ASSIGNED DOCTOR:
- Name: {doctor.name}
- Specialty: {doctor.specialty}
- Subspecialty: {doctor.subspecialty or 'N/A'}
- Experience: {doctor.experience_years} years

Write 2-3 sentences explaining why this doctor is appropriate for this patient.
Be professional and clinical."""

        reasoning = self._generate_response(reasoning_prompt)
        
        return {
            "success": True,
            "assignment": {
                "doctor_id": doctor.id,
                "doctor_name": doctor.name,
                "specialty": doctor.specialty,
                "appointment_slot": selected_slot,
                "consultation_fee": doctor.consultation_fee,
                "reasoning": reasoning
            },
            "message": f"Successfully assigned to Dr. {doctor.name}"
        }


# Create global instance
doctor_matching_agent = DoctorMatchingAgent()
