"""
Patient Summary Agent
Generates patient-friendly summaries of clinical encounters.
Converts medical terminology to plain language.
"""

import json
from typing import Dict, Any, List
from datetime import datetime

import google.generativeai as genai
import os

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


class PatientSummaryAgent:
    """
    Generates patient-friendly summaries of clinical documentation.
    
    Features:
    - Plain language conversion
    - Key instructions highlighting
    - Warning signs explanation
    - Medication instructions
    - Follow-up reminders
    """
    
    def __init__(self, model: str = "gemini-2.0-flash"):
        self.model = genai.GenerativeModel(model)
    
    def _generate_response(self, prompt: str) -> str:
        """Generate response using Gemini"""
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Error generating response: {e}")
            return ""
    
    def generate_patient_summary(
        self,
        soap_note: Dict[str, str],
        diagnoses: List[str] = None,
        medications: List[Dict] = None,
        follow_up_date: str = None,
        patient_name: str = "Patient",
        doctor_name: str = "Your doctor"
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive patient-friendly summary.
        
        Args:
            soap_note: The clinical SOAP note
            diagnoses: List of diagnosis names
            medications: List of {name, dosage, frequency, instructions}
            follow_up_date: When to return
            patient_name: For personalization
            doctor_name: Treating physician
            
        Returns:
            Patient-friendly summary with all sections
        """
        
        # Build context for LLM
        diagnoses_text = ", ".join(diagnoses) if diagnoses else "See below"
        meds_text = json.dumps(medications) if medications else "See plan"
        
        prompt = f"""You are a healthcare communication specialist. Convert this clinical SOAP note into a patient-friendly summary.

CLINICAL SOAP NOTE:
Subjective: {soap_note.get('Subjective', 'N/A')}
Objective: {soap_note.get('Objective', 'N/A')}
Assessment: {soap_note.get('Assessment', 'N/A')}
Plan: {soap_note.get('Plan', 'N/A')}

DIAGNOSES: {diagnoses_text}
MEDICATIONS: {meds_text}
FOLLOW-UP: {follow_up_date or 'To be scheduled'}
PATIENT: {patient_name}
DOCTOR: {doctor_name}

Create a patient-friendly summary with these sections:

1. WHAT WE FOUND (2-3 sentences explaining the diagnosis in simple terms)
2. WHAT'S HAPPENING IN YOUR BODY (1-2 sentences explaining the condition simply)
3. YOUR TREATMENT PLAN:
   - Medications (name, when to take, what it does)
   - Other instructions
4. IMPORTANT INSTRUCTIONS (bullet points)
5. WARNING SIGNS - SEEK CARE IF (specific symptoms to watch for)
6. NEXT STEPS (follow-up, tests, etc.)

RULES:
- Use 6th grade reading level
- Avoid medical jargon - explain terms in parentheses if needed
- Be warm and reassuring but accurate
- Use "you/your" language
- Include specific actionable items

Return as JSON:
{{
  "greeting": "Personal greeting with patient name",
  "visit_summary": "Brief 1-line summary of the visit",
  "what_we_found": "Plain language explanation of diagnosis",
  "body_explanation": "Simple explanation of what's happening",
  "treatment_plan": {{
    "medications": [
      {{
        "name": "medication name",
        "simple_name": "what type of medicine",
        "dosage": "how much",
        "frequency": "when to take",
        "purpose": "what it does in simple terms",
        "special_instructions": "any special notes"
      }}
    ],
    "other_treatments": ["list of other treatments"],
    "lifestyle_advice": ["helpful tips"]
  }},
  "important_instructions": ["actionable instruction 1", "instruction 2"],
  "warning_signs": [
    {{
      "symptom": "what to watch for",
      "action": "what to do"
    }}
  ],
  "next_steps": {{
    "follow_up": "when to come back",
    "tests_needed": ["any tests to do"],
    "contact_info": "when to call the office"
  }},
  "closing_message": "Reassuring closing"
}}

Return ONLY valid JSON."""

        result = self._generate_response(prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            
            # Add metadata
            parsed["generated_at"] = datetime.now().isoformat()
            parsed["doctor_name"] = doctor_name
            parsed["patient_name"] = patient_name
            
            return parsed
            
        except Exception as e:
            # Return basic summary if parsing fails
            return self._generate_basic_summary(soap_note, patient_name, doctor_name)
    
    def _generate_basic_summary(
        self,
        soap_note: Dict[str, str],
        patient_name: str,
        doctor_name: str
    ) -> Dict[str, Any]:
        """Generate a basic summary when LLM parsing fails"""
        
        return {
            "greeting": f"Dear {patient_name},",
            "visit_summary": "Here is a summary of your recent visit.",
            "what_we_found": soap_note.get("Assessment", "Please refer to your detailed notes."),
            "body_explanation": "Your doctor has evaluated your condition.",
            "treatment_plan": {
                "medications": [],
                "other_treatments": [soap_note.get("Plan", "Follow your doctor's instructions")],
                "lifestyle_advice": []
            },
            "important_instructions": ["Follow the treatment plan provided by your doctor"],
            "warning_signs": [
                {
                    "symptom": "If your symptoms get worse",
                    "action": "Contact your doctor or seek medical attention"
                }
            ],
            "next_steps": {
                "follow_up": "As directed by your doctor",
                "tests_needed": [],
                "contact_info": "Call the clinic if you have questions"
            },
            "closing_message": f"Take care, and don't hesitate to reach out if you have questions. - {doctor_name}",
            "generated_at": datetime.now().isoformat()
        }
    
    def format_for_display(self, summary: Dict[str, Any]) -> str:
        """Format summary for text display (e.g., SMS, email, print)"""
        
        lines = []
        
        # Header
        lines.append(f"📋 YOUR VISIT SUMMARY")
        lines.append(f"Date: {datetime.now().strftime('%B %d, %Y')}")
        lines.append("")
        
        # Greeting
        lines.append(summary.get("greeting", "Dear Patient,"))
        lines.append("")
        
        # Visit summary
        lines.append(summary.get("visit_summary", ""))
        lines.append("")
        
        # What we found
        lines.append("🔍 WHAT WE FOUND:")
        lines.append(summary.get("what_we_found", ""))
        lines.append("")
        
        # Body explanation
        if summary.get("body_explanation"):
            lines.append(summary["body_explanation"])
            lines.append("")
        
        # Treatment plan
        lines.append("💊 YOUR TREATMENT PLAN:")
        
        treatment = summary.get("treatment_plan", {})
        
        # Medications
        for med in treatment.get("medications", []):
            lines.append(f"  • {med.get('name', 'Medication')}")
            lines.append(f"    - Take: {med.get('dosage', '')} {med.get('frequency', '')}")
            lines.append(f"    - Purpose: {med.get('purpose', '')}")
            if med.get("special_instructions"):
                lines.append(f"    - Note: {med['special_instructions']}")
        
        # Other treatments
        for treatment_item in treatment.get("other_treatments", []):
            lines.append(f"  • {treatment_item}")
        
        lines.append("")
        
        # Important instructions
        lines.append("📌 IMPORTANT INSTRUCTIONS:")
        for instruction in summary.get("important_instructions", []):
            lines.append(f"  ✓ {instruction}")
        lines.append("")
        
        # Warning signs
        lines.append("⚠️ WARNING SIGNS - SEEK CARE IF:")
        for warning in summary.get("warning_signs", []):
            if isinstance(warning, dict):
                lines.append(f"  🚨 {warning.get('symptom', '')} → {warning.get('action', '')}")
            else:
                lines.append(f"  🚨 {warning}")
        lines.append("")
        
        # Next steps
        lines.append("📅 NEXT STEPS:")
        next_steps = summary.get("next_steps", {})
        if next_steps.get("follow_up"):
            lines.append(f"  • Follow-up: {next_steps['follow_up']}")
        for test in next_steps.get("tests_needed", []):
            lines.append(f"  • Test needed: {test}")
        if next_steps.get("contact_info"):
            lines.append(f"  • Questions? {next_steps['contact_info']}")
        lines.append("")
        
        # Closing
        lines.append(summary.get("closing_message", "Wishing you a speedy recovery!"))
        
        return "\n".join(lines)
    
    def format_for_html(self, summary: Dict[str, Any]) -> str:
        """Format summary as HTML for web display"""
        
        html_parts = []
        
        # CSS styling
        html_parts.append("""
<style>
.patient-summary {
    font-family: 'Segoe UI', Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    color: white;
}
.summary-header {
    text-align: center;
    margin-bottom: 20px;
}
.summary-section {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 15px;
    margin: 10px 0;
}
.section-title {
    font-weight: bold;
    font-size: 1.1em;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.medication-card {
    background: rgba(255,255,255,0.15);
    border-radius: 8px;
    padding: 10px;
    margin: 8px 0;
}
.warning-box {
    background: rgba(255,100,100,0.2);
    border-left: 4px solid #ff6b6b;
    padding: 10px 15px;
    border-radius: 5px;
}
.instruction-item {
    padding: 5px 0;
    display: flex;
    align-items: center;
    gap: 8px;
}
</style>
""")
        
        # Main container
        html_parts.append('<div class="patient-summary">')
        
        # Header
        html_parts.append(f'''
<div class="summary-header">
    <h2>📋 Your Visit Summary</h2>
    <p>{datetime.now().strftime('%B %d, %Y')}</p>
</div>
''')
        
        # Greeting
        html_parts.append(f'''
<div class="summary-section">
    <p>{summary.get("greeting", "Dear Patient,")}</p>
    <p><strong>{summary.get("visit_summary", "")}</strong></p>
</div>
''')
        
        # What we found
        html_parts.append(f'''
<div class="summary-section">
    <div class="section-title">🔍 What We Found</div>
    <p>{summary.get("what_we_found", "")}</p>
    <p><em>{summary.get("body_explanation", "")}</em></p>
</div>
''')
        
        # Treatment plan
        treatment = summary.get("treatment_plan", {})
        meds_html = ""
        for med in treatment.get("medications", []):
            meds_html += f'''
<div class="medication-card">
    <strong>💊 {med.get('name', 'Medication')}</strong>
    <br>Take: {med.get('dosage', '')} {med.get('frequency', '')}
    <br>Purpose: {med.get('purpose', '')}
</div>
'''
        
        html_parts.append(f'''
<div class="summary-section">
    <div class="section-title">💊 Your Treatment Plan</div>
    {meds_html}
</div>
''')
        
        # Instructions
        instructions_html = "".join([
            f'<div class="instruction-item">✓ {inst}</div>'
            for inst in summary.get("important_instructions", [])
        ])
        
        html_parts.append(f'''
<div class="summary-section">
    <div class="section-title">📌 Important Instructions</div>
    {instructions_html}
</div>
''')
        
        # Warning signs
        warnings_html = ""
        for warning in summary.get("warning_signs", []):
            if isinstance(warning, dict):
                warnings_html += f'<div>🚨 {warning.get("symptom", "")} → <strong>{warning.get("action", "")}</strong></div>'
            else:
                warnings_html += f'<div>🚨 {warning}</div>'
        
        html_parts.append(f'''
<div class="summary-section warning-box">
    <div class="section-title">⚠️ Warning Signs - Seek Care If:</div>
    {warnings_html}
</div>
''')
        
        # Next steps
        next_steps = summary.get("next_steps", {})
        html_parts.append(f'''
<div class="summary-section">
    <div class="section-title">📅 Next Steps</div>
    <div>📆 Follow-up: {next_steps.get("follow_up", "As directed")}</div>
    <div>📞 {next_steps.get("contact_info", "Call if you have questions")}</div>
</div>
''')
        
        # Closing
        html_parts.append(f'''
<div class="summary-section" style="text-align: center;">
    <p>{summary.get("closing_message", "Wishing you well!")}</p>
</div>
''')
        
        html_parts.append('</div>')
        
        return "".join(html_parts)
    
    def generate_sms_summary(
        self,
        soap_note: Dict[str, str],
        patient_name: str = "Patient"
    ) -> str:
        """Generate a brief SMS-friendly summary (under 160 chars ideal)"""
        
        prompt = f"""Create a very brief SMS summary (under 300 characters) for this clinical note.

ASSESSMENT: {soap_note.get('Assessment', '')}
PLAN: {soap_note.get('Plan', '')}

Format: "[Greeting] [What was found] [Key action] [When to follow up]"

Example: "Hi John! Your visit showed a throat infection. Take your antibiotics 3x daily. Call if fever >101°F. See you in 1 week! -Dr. Smith"

Keep it warm but concise. Return ONLY the SMS text."""

        result = self._generate_response(prompt)
        
        # Ensure it's not too long
        if len(result) > 300:
            result = result[:297] + "..."
        
        return result


# Create global instance
patient_summary_agent = PatientSummaryAgent()
