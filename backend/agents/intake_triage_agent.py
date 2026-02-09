"""
Intake & Triage Agent
Handles patient symptom collection through conversational interface
and generates triage priority with preliminary SOAP
"""

import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

import os
from groq import Groq

# Configure Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


class TriagePriority(Enum):
    RED = "red"           # Emergency - Immediate attention
    ORANGE = "orange"     # Urgent - Within 10 minutes
    YELLOW = "yellow"     # Semi-urgent - Within 1 hour
    GREEN = "green"       # Routine - Standard scheduling


@dataclass
class IntakeSession:
    """Represents a patient intake session"""
    session_id: str
    patient_id: Optional[str] = None
    conversation_history: List[Dict] = field(default_factory=list)
    current_stage: str = "greeting"
    symptoms: List[str] = field(default_factory=list)
    symptom_details: Dict = field(default_factory=dict)
    vitals: Dict = field(default_factory=dict)
    medical_history: Dict = field(default_factory=dict)
    allergies: List[str] = field(default_factory=list)
    current_medications: List[str] = field(default_factory=list)
    triage_priority: Optional[TriagePriority] = None
    triage_score: int = 5
    preliminary_soap: Optional[Dict] = None
    final_soap: Optional[Dict] = None
    suggested_specialties: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


class IntakeTriageAgent:
    """
    Conversational agent for patient intake and triage assessment.
    Guides patients through symptom collection and generates preliminary SOAP.
    """
    
    INTAKE_STAGES = [
        "greeting",
        "chief_complaint",
        "symptom_details",
        "duration_severity",
        "associated_symptoms",
        "medical_history",
        "medications_allergies",
        "vitals",
        "summary_confirmation",
        "complete"
    ]
    
    # Red flag symptoms that trigger immediate escalation
    RED_FLAG_KEYWORDS = [
        "chest pain", "crushing", "can't breathe", "difficulty breathing",
        "severe bleeding", "unconscious", "seizure", "stroke", "paralysis",
        "suicidal", "overdose", "poisoning", "severe allergic", "anaphylaxis",
        "worst headache", "sudden weakness", "vision loss", "facial droop"
    ]
    
    def __init__(self, model: str = "llama-3.3-70b-versatile"):
        self.model = model
        self.sessions: Dict[str, IntakeSession] = {}
    
    def create_session(self, session_id: str, patient_id: Optional[str] = None) -> IntakeSession:
        """Create a new intake session"""
        session = IntakeSession(session_id=session_id, patient_id=patient_id)
        self.sessions[session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional[IntakeSession]:
        """Retrieve an existing session"""
        return self.sessions.get(session_id)
    
    def _check_red_flags(self, text: str) -> bool:
        """Check if text contains any red flag symptoms"""
        text_lower = text.lower()
        return any(flag in text_lower for flag in self.RED_FLAG_KEYWORDS)
    
    def _generate_response(self, prompt: str) -> str:
        """Generate response using Groq"""
        try:
            response = groq_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful healthcare intake assistant. Always respond with valid JSON when asked."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1024
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error generating response: {e}")
            return "I'm having trouble processing that. Could you please try again?"
    
    def get_greeting_message(self) -> str:
        """Get initial greeting message"""
        return """👋 Hello! I'm your virtual health assistant. I'm here to help understand your symptoms and connect you with the right doctor.

⚠️ Important: This is not an emergency service. If you're experiencing a life-threatening emergency, please call emergency services (108/112) immediately.

To get started, could you please tell me:
What brings you in today? What's your main concern or symptom?"""
    
    def process_message(self, session_id: str, user_message: str) -> Dict[str, Any]:
        """
        Process a user message and return the next response.
        Uses dynamic LLM-driven questioning based on conversation context.
        """
        session = self.sessions.get(session_id)
        if not session:
            return {
                "error": "Session not found",
                "response": "Session expired. Please start a new conversation."
            }
        
        # Initialize turn tracking if not exists
        if not hasattr(session, 'turn_count'):
            session.turn_count = 0
            session.max_turns = 8
            session.collected_info = {
                "chief_complaint": None,
                "location": None,
                "duration": None,
                "severity": None,
                "associated_symptoms": None,
                "medical_history": None,
                "medications_allergies": None
            }
        
        # Increment turn count
        session.turn_count += 1
        
        # Add user message to history
        session.conversation_history.append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Check for red flags first
        is_emergency = self._check_red_flags(user_message)
        if is_emergency:
            session.triage_priority = TriagePriority.RED
            session.triage_score = 10
            emergency_response = self._handle_emergency(session, user_message)
            return emergency_response
        
        # Extract information from the current message
        self._extract_information(session, user_message)
        
        # Check if we should complete the intake
        should_complete = self._should_complete_intake(session)
        
        if should_complete or session.turn_count >= session.max_turns:
            response_data = self._complete_intake_dynamic(session)
        else:
            # Generate dynamic follow-up question
            response_data = self._generate_dynamic_question(session)
        
        # Add assistant response to history
        session.conversation_history.append({
            "role": "assistant",
            "content": response_data["response"],
            "timestamp": datetime.now().isoformat()
        })
        
        return response_data
    
    def _extract_information(self, session: IntakeSession, user_message: str) -> None:
        """Extract and categorize information from user message"""
        
        conversation_context = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in session.conversation_history[-6:]
        ])
        
        extract_prompt = f"""Analyze this patient message and extract health information.

CONVERSATION:
{conversation_context}

CURRENT MESSAGE: "{user_message}"

Extract and return as JSON:
{{
    "chief_complaint": "main symptom if mentioned, or null",
    "location": "body location if specified, or null",
    "duration": "how long symptoms present, or null",
    "severity": "severity 1-10 or description, or null",
    "associated_symptoms": ["list of additional symptoms"],
    "medical_history": "conditions mentioned, or null",
    "medications_allergies": "medications/allergies, or null"
}}

Return ONLY valid JSON."""

        result = self._generate_response(extract_prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            
            # Update collected info with non-null values
            for key, value in parsed.items():
                if value is not None and key in session.collected_info:
                    if key == "associated_symptoms" and isinstance(value, list):
                        existing = session.collected_info.get(key) or []
                        session.collected_info[key] = list(set(existing + value))
                    else:
                        session.collected_info[key] = value
                        
            # Also update symptom_details
            if parsed.get("chief_complaint"):
                session.symptom_details["chief_complaint"] = parsed["chief_complaint"]
                session.symptoms = [parsed["chief_complaint"]]
            if parsed.get("duration"):
                session.symptom_details["duration"] = parsed["duration"]
            if parsed.get("severity"):
                session.symptom_details["severity"] = parsed["severity"]
                
        except Exception as e:
            print(f"Error extracting information: {e}")

    def _should_complete_intake(self, session: IntakeSession) -> bool:
        """Determine if enough information has been collected"""
        collected = session.collected_info
        
        has_chief_complaint = collected.get("chief_complaint") is not None
        has_duration = collected.get("duration") is not None
        has_severity = collected.get("severity") is not None
        
        min_turns_reached = session.turn_count >= 3
        basic_info_complete = has_chief_complaint and (has_duration or has_severity)
        has_additional = collected.get("associated_symptoms") or collected.get("medical_history")
        
        if min_turns_reached and basic_info_complete and (has_additional or session.turn_count >= 5):
            return True
        return False
    
    def _generate_dynamic_question(self, session: IntakeSession) -> Dict[str, Any]:
        """Generate contextual follow-up question based on conversation"""
        
        conversation_context = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in session.conversation_history
        ])
        
        collected = session.collected_info
        
        prompt = f"""You are a compassionate healthcare intake assistant. Based on the conversation, generate the NEXT most relevant question.

CONVERSATION:
{conversation_context}

INFORMATION COLLECTED:
- Chief complaint: {collected.get('chief_complaint') or 'Unknown'}
- Location: {collected.get('location') or 'Unknown'}
- Duration: {collected.get('duration') or 'Unknown'}
- Severity: {collected.get('severity') or 'Unknown'}
- Associated symptoms: {collected.get('associated_symptoms') or 'Unknown'}
- Medical history: {collected.get('medical_history') or 'Unknown'}

TURN: {session.turn_count} of {session.max_turns}

RULES:
1. Ask ONE focused question about missing information
2. Be empathetic and warm
3. Briefly acknowledge what patient shared
4. Keep response to 2-3 sentences max
5. Use simple language, no medical jargon

Return JSON:
{{"response": "Your empathetic response with follow-up question"}}"""

        result = self._generate_response(prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            response = parsed.get("response", "Could you tell me more about your symptoms?")
        except:
            response = "Thank you for sharing that. Could you tell me more about your symptoms?"
        
        return {
            "response": response,
            "stage": "active",
            "turn_count": session.turn_count,
            "max_turns": session.max_turns,
            "collected_info": session.collected_info
        }
    
    def _complete_intake_dynamic(self, session: IntakeSession) -> Dict[str, Any]:
        """Complete intake with dynamic data and generate SOAP"""
        session.current_stage = "complete"
        
        # Generate triage
        triage_result = self._generate_triage(session)
        session.triage_priority = TriagePriority(triage_result["priority"])
        session.triage_score = triage_result["score"]
        session.suggested_specialties = triage_result["specialties"]
        
        # Generate preliminary SOAP
        soap_result = self._generate_preliminary_soap(session)
        session.preliminary_soap = soap_result
        
        collected = session.collected_info
        chief = collected.get("chief_complaint") or "Symptoms described"
        duration = collected.get("duration") or "Not specified"
        severity = collected.get("severity") or "Not specified"
        
        priority_emoji = {"red": "🔴", "orange": "🟠", "yellow": "🟡", "green": "🟢"}
        p = triage_result["priority"]
        
        response = f"""✅ Thank you for completing the intake!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Summary:
• Main concern: {chief}
• Duration: {duration}
• Severity: {severity}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{priority_emoji[p]} Triage: {p.title()}
🏥 Specialty: {session.suggested_specialties[0] if session.suggested_specialties else 'General Medicine'}

Type "Yes" to find available doctors."""

        return {
            "response": response,
            "stage": "complete",
            "triage": triage_result,
            "preliminary_soap": soap_result,
            "session_complete": True,
            "suggested_specialties": session.suggested_specialties,
            "turn_count": session.turn_count,
            "max_turns": session.max_turns
        }
    
    def _handle_emergency(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Handle emergency/red flag situations"""
        response = """⚠️ URGENT ALERT

Based on what you've described, this could be a medical emergency.

Please take these steps immediately:
1. 🚨 Call emergency services: 108 or 112
2. Do not drive yourself - wait for emergency medical services
3. If someone is with you, let them know about your symptoms

I've flagged your case as HIGH PRIORITY. If you still want to continue with the intake, a doctor will be notified immediately.

Would you like me to:
1. Connect you with emergency services information
2. Continue with intake (a doctor will see your case urgently)

Please type 1 or 2, or describe if your situation has changed."""

        return {
            "response": response,
            "stage": session.current_stage,
            "is_emergency": True,
            "triage_priority": "red",
            "triage_score": 10,
            "action_required": "emergency_escalation"
        }
    
    def _process_stage(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Process message based on current conversation stage"""
        
        stage = session.current_stage
        
        if stage == "greeting":
            return self._process_chief_complaint(session, user_message)
        
        elif stage == "chief_complaint":
            return self._process_symptom_details(session, user_message)
        
        elif stage == "symptom_details":
            return self._process_duration_severity(session, user_message)
        
        elif stage == "duration_severity":
            return self._process_associated_symptoms(session, user_message)
        
        elif stage == "associated_symptoms":
            return self._process_medical_history(session, user_message)
        
        elif stage == "medical_history":
            return self._process_medications_allergies(session, user_message)
        
        elif stage == "medications_allergies":
            return self._process_vitals(session, user_message)
        
        elif stage == "vitals":
            return self._complete_intake(session, user_message)
        
        else:
            return self._complete_intake(session, user_message)
    
    def _process_chief_complaint(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Extract and clarify chief complaint"""
        
        # Use LLM to extract symptoms
        extract_prompt = f"""Extract the main symptoms/complaints from this patient message.
Return as JSON: {{"symptoms": ["symptom1", "symptom2"], "needs_clarification": true/false, "clarification_question": "question if needed"}}

Patient said: "{user_message}"

If the complaint is vague, set needs_clarification to true and provide a follow-up question.
Return ONLY valid JSON."""

        result = self._generate_response(extract_prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            session.symptoms = parsed.get("symptoms", [user_message])
            session.symptom_details["chief_complaint"] = user_message
            
            if parsed.get("needs_clarification"):
                response = parsed.get("clarification_question", 
                    "Could you tell me more about that? Where exactly do you feel the discomfort?")
            else:
                session.current_stage = "chief_complaint"
                response = f"""Thank you for sharing that. I understand you're experiencing: {', '.join(session.symptoms)}

Now, let me ask a few more questions to better understand your symptoms.

📍 Where exactly is the problem? (e.g., left side of chest, lower back, behind eyes)
And can you describe what it feels like? (e.g., sharp, dull, throbbing, burning)"""
        
        except:
            session.symptoms = [user_message]
            session.current_stage = "chief_complaint"
            response = f"""I see. Let me understand this better.

📍 Where exactly do you feel this?
And how would you describe the sensation? (e.g., sharp pain, dull ache, pressure)"""
        
        return {
            "response": response,
            "stage": session.current_stage,
            "extracted": {"symptoms": session.symptoms}
        }
    
    def _process_symptom_details(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Gather detailed symptom information"""
        
        session.symptom_details["location_description"] = user_message
        session.current_stage = "symptom_details"
        
        response = """Got it, thank you for that detail.

⏱️ How long have you been experiencing this?
- When did it start? (e.g., 2 days ago, this morning, for the past week)
- Is it constant or does it come and go?

📊 On a scale of 1-10, how severe is it?
(1 = barely noticeable, 10 = worst imaginable)"""
        
        return {
            "response": response,
            "stage": session.current_stage
        }
    
    def _process_duration_severity(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Process duration and severity information"""
        
        # Extract duration and severity using LLM
        extract_prompt = f"""Extract duration and severity from this patient message.
Return as JSON: {{"duration": "X days/hours/weeks", "severity": 1-10, "pattern": "constant/intermittent"}}

Patient said: "{user_message}"
Return ONLY valid JSON. If severity not mentioned, estimate based on language used."""

        result = self._generate_response(extract_prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            session.symptom_details["duration"] = parsed.get("duration", "Not specified")
            session.symptom_details["severity"] = parsed.get("severity", 5)
            session.symptom_details["pattern"] = parsed.get("pattern", "Not specified")
        except:
            session.symptom_details["duration_raw"] = user_message
        
        session.current_stage = "duration_severity"
        
        response = """Thank you. Now let's check for any related symptoms.

🔍 Are you experiencing any of these along with your main symptom?
- Fever or chills
- Nausea or vomiting
- Fatigue or weakness
- Headache
- Dizziness
- Any other symptoms

Please list any additional symptoms you're experiencing, or type "None" if there aren't any."""
        
        return {
            "response": response,
            "stage": session.current_stage,
            "extracted": session.symptom_details
        }
    
    def _process_associated_symptoms(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Process associated symptoms"""
        
        if user_message.lower() not in ["none", "no", "nothing", "n/a"]:
            extract_prompt = f"""Extract all symptoms mentioned.
Return as JSON: {{"associated_symptoms": ["symptom1", "symptom2"]}}

Patient said: "{user_message}"
Return ONLY valid JSON."""

            result = self._generate_response(extract_prompt)
            try:
                parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
                session.symptom_details["associated_symptoms"] = parsed.get("associated_symptoms", [])
            except:
                session.symptom_details["associated_symptoms"] = [user_message]
        
        session.current_stage = "associated_symptoms"
        
        response = """Noted. Now, a few questions about your medical background.

📋 Medical History:
1. Do you have any ongoing medical conditions? (e.g., diabetes, hypertension, asthma, heart disease)
2. Have you had any surgeries in the past?
3. Is there any relevant family history of medical conditions?

Please share what's relevant, or type "None" if not applicable."""
        
        return {
            "response": response,
            "stage": session.current_stage
        }
    
    def _process_medical_history(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Process medical history"""
        
        if user_message.lower() not in ["none", "no", "nothing", "n/a"]:
            extract_prompt = f"""Extract medical history information.
Return as JSON: {{"conditions": [], "surgeries": [], "family_history": []}}

Patient said: "{user_message}"
Return ONLY valid JSON."""

            result = self._generate_response(extract_prompt)
            try:
                parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
                session.medical_history = parsed
            except:
                session.medical_history["raw"] = user_message
        
        session.current_stage = "medical_history"
        
        response = """Thank you for sharing that.

💊 Medications & Allergies:
1. Are you currently taking any medications? (prescription or over-the-counter)
2. Do you have any known allergies? (medications, food, or environmental)

Please list them, or type "None" if not applicable."""
        
        return {
            "response": response,
            "stage": session.current_stage
        }
    
    def _process_medications_allergies(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Process medications and allergies"""
        
        if user_message.lower() not in ["none", "no", "nothing", "n/a"]:
            extract_prompt = f"""Extract medications and allergies.
Return as JSON: {{"medications": [], "allergies": []}}

Patient said: "{user_message}"
Return ONLY valid JSON."""

            result = self._generate_response(extract_prompt)
            try:
                parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
                session.current_medications = parsed.get("medications", [])
                session.allergies = parsed.get("allergies", [])
            except:
                pass
        
        session.current_stage = "medications_allergies"
        
        response = """Almost done! Just one more thing.

🌡️ Current Vitals (if you have them):
If you have access to any of these measurements, please share:
- Temperature
- Blood pressure
- Heart rate/pulse
- Oxygen level (SpO2)

If you don't have these available, just type "Not available" and we'll continue."""
        
        return {
            "response": response,
            "stage": session.current_stage
        }
    
    def _process_vitals(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Process vitals if provided"""
        
        if user_message.lower() not in ["not available", "none", "no", "n/a", "don't have"]:
            extract_prompt = f"""Extract vital signs from this message.
Return as JSON: {{"temperature": "value or null", "blood_pressure": "value or null", "heart_rate": "value or null", "oxygen_saturation": "value or null"}}

Patient said: "{user_message}"
Return ONLY valid JSON. Use null for missing values."""

            result = self._generate_response(extract_prompt)
            try:
                parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
                session.vitals = {k: v for k, v in parsed.items() if v is not None}
            except:
                pass
        
        session.current_stage = "vitals"
        
        # Now complete the intake
        return self._complete_intake(session, user_message)
    
    def _complete_intake(self, session: IntakeSession, user_message: str) -> Dict[str, Any]:
        """Complete intake, generate triage and preliminary SOAP"""
        
        session.current_stage = "complete"
        
        # Generate triage assessment
        triage_result = self._generate_triage(session)
        session.triage_priority = TriagePriority(triage_result["priority"])
        session.triage_score = triage_result["score"]
        session.suggested_specialties = triage_result["specialties"]
        
        # Generate preliminary SOAP
        soap_result = self._generate_preliminary_soap(session)
        session.preliminary_soap = soap_result
        
        # Create summary response
        priority_emoji = {
            "red": "🔴",
            "orange": "🟠",
            "yellow": "🟡",
            "green": "🟢"
        }
        
        priority_text = {
            "red": "Emergency - Immediate attention needed",
            "orange": "Urgent - Priority scheduling",
            "yellow": "Semi-Urgent - Same-day appointment recommended",
            "green": "Routine - Standard scheduling"
        }
        
        p = triage_result["priority"]
        
        response = f"""✅ Thank you for completing the intake assessment!

---
📋 Summary of Your Symptoms:
• Main concern: {', '.join(session.symptoms)}
• Duration: {session.symptom_details.get('duration', 'Not specified')}
• Severity: {session.symptom_details.get('severity', 'Not specified')}/10

---
{priority_emoji[p]} Triage Assessment: {priority_text[p]}

🏥 Recommended Specialty: {session.suggested_specialties[0] if session.suggested_specialties else 'General Medicine'}

---
What happens next:
1. We'll match you with the most suitable doctor
2. You'll receive appointment options based on availability
3. The doctor will review your preliminary assessment before your visit

Would you like me to proceed with finding an available doctor?
Type "Yes" to continue or "No" if you have more symptoms to add."""

        return {
            "response": response,
            "stage": "complete",
            "triage": triage_result,
            "preliminary_soap": soap_result,
            "session_complete": True,
            "suggested_specialties": session.suggested_specialties
        }
    
    def _generate_triage(self, session: IntakeSession) -> Dict[str, Any]:
        """Generate triage priority based on collected information"""
        
        session_summary = {
            "symptoms": session.symptoms,
            "symptom_details": session.symptom_details,
            "medical_history": session.medical_history,
            "vitals": session.vitals,
            "allergies": session.allergies
        }
        
        triage_prompt = f"""You are a clinical triage specialist. Assess this patient intake and provide triage priority.

PATIENT INFORMATION:
{json.dumps(session_summary, indent=2)}

TRIAGE CRITERIA:
- RED (Emergency): Life-threatening, needs immediate attention. Score 9-10.
  Examples: Chest pain with cardiac features, stroke symptoms, severe breathing difficulty, active bleeding
  
- ORANGE (Urgent): Serious but not immediately life-threatening. Score 7-8.
  Examples: High fever with concerning symptoms, moderate breathing issues, severe pain
  
- YELLOW (Semi-Urgent): Needs attention within hours. Score 4-6.
  Examples: Moderate pain, persistent symptoms, infections needing treatment
  
- GREEN (Routine): Can wait for scheduled appointment. Score 1-3.
  Examples: Mild symptoms, follow-ups, preventive care, chronic condition management

Return as JSON:
{{
  "priority": "red|orange|yellow|green",
  "score": 1-10,
  "reasoning": "Brief explanation",
  "specialties": ["Primary specialty", "Alternative specialty"],
  "red_flags_detected": ["any concerning signs"],
  "recommendations": ["immediate actions if any"]
}}

Return ONLY valid JSON."""

        result = self._generate_response(triage_prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            return {
                "priority": parsed.get("priority", "yellow"),
                "score": parsed.get("score", 5),
                "reasoning": parsed.get("reasoning", ""),
                "specialties": parsed.get("specialties", ["General Medicine"]),
                "red_flags": parsed.get("red_flags_detected", []),
                "recommendations": parsed.get("recommendations", [])
            }
        except:
            # Default to moderate priority if parsing fails
            return {
                "priority": "yellow",
                "score": 5,
                "reasoning": "Default assessment - please review",
                "specialties": ["General Medicine"],
                "red_flags": [],
                "recommendations": []
            }
    
    def _generate_preliminary_soap(self, session: IntakeSession) -> Dict[str, Any]:
        """Generate preliminary SOAP note from intake"""
        
        conversation_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in session.conversation_history
        ])
        
        soap_prompt = f"""Generate a preliminary SOAP note from this patient intake conversation.

CONVERSATION:
{conversation_text}

EXTRACTED DATA:
- Symptoms: {session.symptoms}
- Symptom Details: {json.dumps(session.symptom_details)}
- Medical History: {json.dumps(session.medical_history)}
- Medications: {session.current_medications}
- Allergies: {session.allergies}
- Vitals: {json.dumps(session.vitals)}

Generate a PRELIMINARY SOAP note for the doctor to review and complete:

Return as JSON:
{{
  "Subjective": "Patient-reported symptoms, history, and complaints from the intake. Include duration, severity, and associated symptoms.",
  "Objective": "Available vitals and any measurable data provided. Note what still needs to be assessed by doctor.",
  "Assessment": "Preliminary assessment based on reported symptoms. Include differential diagnoses to consider. Mark as 'PRELIMINARY - Pending physician examination'",
  "Plan": "Suggested initial workup and questions for the physician to address. This is NOT a treatment plan - just guidance for the consultation."
}}

IMPORTANT: 
- This is a PRE-VISIT note, not final documentation
- Mark uncertain areas clearly
- The doctor will complete the examination and finalize
Return ONLY valid JSON."""

        result = self._generate_response(soap_prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            return {
                "Subjective": parsed.get("Subjective", ""),
                "Objective": parsed.get("Objective", ""),
                "Assessment": parsed.get("Assessment", ""),
                "Plan": parsed.get("Plan", ""),
                "is_preliminary": True,
                "generated_at": datetime.now().isoformat()
            }
        except:
            return {
                "Subjective": f"Patient reports: {', '.join(session.symptoms)}",
                "Objective": "Pending physician examination",
                "Assessment": "PRELIMINARY - Pending physician examination",
                "Plan": "Complete physical examination and clinical assessment",
                "is_preliminary": True,
                "generated_at": datetime.now().isoformat()
            }
    
    def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        """Get complete session summary for storage/transfer"""
        session = self.sessions.get(session_id)
        if not session:
            return {"error": "Session not found"}
        
        return {
            "session_id": session.session_id,
            "patient_id": session.patient_id,
            "conversation_history": session.conversation_history,
            "symptoms": session.symptoms,
            "symptom_details": session.symptom_details,
            "vitals": session.vitals,
            "medical_history": session.medical_history,
            "allergies": session.allergies,
            "current_medications": session.current_medications,
            "triage_priority": session.triage_priority.value if session.triage_priority else None,
            "triage_score": session.triage_score,
            "preliminary_soap": session.preliminary_soap,
            "suggested_specialties": session.suggested_specialties,
            "created_at": session.created_at.isoformat(),
            "current_stage": session.current_stage
        }


# Create global instance
intake_agent = IntakeTriageAgent()
