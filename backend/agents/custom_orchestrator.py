"""
Custom Agent Orchestrator - Uses Groq as primary LLM (free tier) with Gemini fallback
No OpenAI dependency required!
"""

import os
from dotenv import load_dotenv
load_dotenv()
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

# Try to import Groq (primary LLM)
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("⚠️ Groq not installed for orchestrator.")

# Try to import Gemini (fallback)
try:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Gemini not installed for orchestrator.")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class AgentType(Enum):
    STRUCTURING = "structuring"
    CHAT = "chat"
    ANALYTICS = "analytics"
    QUALITY = "quality"

@dataclass
class AgentResult:
    agent_type: AgentType
    success: bool
    data: Dict[str, Any]
    confidence: float
    errors: List[str]

import time

class GeminiAgent:
    """Base agent class using Groq as primary LLM with Gemini fallback"""
    
    def __init__(self, name: str, role: str, goal: str, model: str = "gemini-2.5-flash"):
        self.name = name
        self.role = role
        self.goal = goal
        self.model_name = model
        self.groq_model = "llama-3.3-70b-versatile"
        
        # Initialize Groq client
        if GROQ_AVAILABLE and GROQ_API_KEY:
            self.groq_client = Groq(api_key=GROQ_API_KEY)
        else:
            self.groq_client = None
            
        # Initialize Gemini as fallback
        if GEMINI_AVAILABLE:
            self.model = genai.GenerativeModel(model)
        else:
            self.model = None
    
    def run(self, prompt: str) -> str:
        """Execute a prompt - try Groq first, fallback to Gemini"""
        
        # Try Groq first (primary)
        if self.groq_client:
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.groq_model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=4096,
                    temperature=0.3
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"⚠️ Groq error in {self.name}: {e}")
                # Fall through to Gemini
        
        # Fallback to Gemini
        if self.model:
            retries = 3
            base_delay = 15

            for attempt in range(retries):
                try:
                    if attempt == 0:
                        time.sleep(2) 
                        
                    response = self.model.generate_content(prompt)
                    return response.text.strip()
                    
                except Exception as e:
                    error_msg = str(e).lower()
                    
                    if "429" in error_msg or "quota" in error_msg:
                        wait_time = base_delay * (attempt + 1)
                        print(f"⚠️ Gemini quota exceeded. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    
                    if "404" in error_msg or "not found" in error_msg:
                        try:
                            fallback = genai.GenerativeModel("gemini-pro")
                            response = fallback.generate_content(prompt)
                            return response.text.strip()
                        except Exception as e2:
                            return f"Error (Fallback failed): {str(e2)}"
                    
                    print(f"Error with Gemini: {e}")
                    return f"Error: {str(e)}"
            
            return "Error: Max retries exceeded due to rate limits."
        
        return "Error: No LLM available (neither Groq nor Gemini configured)"

class StructuringAgent(GeminiAgent):
    """Agent for SOAP structuring with multi-step extraction"""
    
    def __init__(self):
        super().__init__(
            name="SOAP Structuring Agent",
            role="Clinical Documentation Specialist",
            goal="Convert unstructured clinical notes to SOAP format with high accuracy"
        )
    
    def extract_soap(self, clinical_text: str) -> Dict[str, Any]:
        """Multi-step SOAP extraction for improved accuracy"""
        
        # Step 1: Extract clinical entities first
        entities_prompt = f"""You are a clinical NER specialist. Extract ALL clinical entities from this note.

CLINICAL NOTE:
\"\"\"{clinical_text}\"\"\"

Extract and categorize:
1. SYMPTOMS: Patient complaints, symptoms (e.g., "chest pain", "fever for 3 days")
2. VITALS: Blood pressure, heart rate, temperature, SpO2, weight, height
3. LAB_VALUES: Any lab results (CBC, BMP, glucose, etc.)
4. PHYSICAL_EXAM: Examination findings (e.g., "lungs clear", "tender abdomen")
5. DIAGNOSES: Any mentioned conditions or diagnoses
6. MEDICATIONS: Current or prescribed medications with dosages
7. PROCEDURES: Any procedures mentioned or planned
8. HISTORY: Past medical history, family history, social history

Return as JSON:
{{
  "symptoms": [],
  "vitals": [],
  "lab_values": [],
  "physical_exam": [],
  "diagnoses": [],
  "medications": [],
  "procedures": [],
  "history": []
}}

Return ONLY valid JSON, no explanations."""

        entities_response = self.run(entities_prompt)
        
        try:
            entities = self._parse_json(entities_response)
        except:
            entities = {}
        
        # Step 2: Structure into SOAP using extracted entities
        soap_prompt = f"""You are an expert clinical documentation specialist. Structure this clinical note into SOAP format.

ORIGINAL NOTE:
\"\"\"{clinical_text}\"\"\"

EXTRACTED ENTITIES (use these to ensure completeness):
{json.dumps(entities, indent=2)}

SOAP DEFINITIONS:
- SUBJECTIVE: What the PATIENT reports - symptoms, complaints, history, concerns, duration of illness
  Examples: "Patient reports chest pain for 2 days", "Complains of fatigue", "States she has diabetes"

- OBJECTIVE: What the CLINICIAN observes/measures - vitals, physical exam, lab results, imaging
  Examples: "BP 140/90", "Heart rate 88", "Lungs clear to auscultation", "CBC shows WBC 12,000"

- ASSESSMENT: Clinical conclusions - diagnoses, differential diagnoses, clinical impressions
  Examples: "Acute bronchitis", "Type 2 Diabetes Mellitus, uncontrolled", "Rule out pneumonia"

- PLAN: Treatment decisions - medications, tests ordered, referrals, follow-up
  Examples: "Start Amoxicillin 500mg TID", "Order chest X-ray", "Follow up in 2 weeks"

CRITICAL RULES:
1. Use EXACT text from the note when possible
2. If a section has no information, write "Not documented in note"
3. Vitals and lab values MUST go in Objective
4. Patient statements MUST go in Subjective
5. Include ALL relevant information - be comprehensive
6. Medications prescribed go in Plan; current medications go in Subjective/History

Return as JSON:
{{
  "SOAP": {{
    "Subjective": "<comprehensive text>",
    "Objective": "<comprehensive text>",
    "Assessment": "<comprehensive text>",
    "Plan": "<comprehensive text>"
  }},
  "confidence": {{
    "Subjective": 0.0-1.0,
    "Objective": 0.0-1.0,
    "Assessment": 0.0-1.0,
    "Plan": 0.0-1.0,
    "overall": 0.0-1.0
  }},
  "flags": ["list any concerns or missing critical info"]
}}

Return ONLY valid JSON."""

        soap_response = self.run(soap_prompt)
        
        try:
            result = self._parse_json(soap_response)
            result["extracted_entities"] = entities
            return result
        except Exception as e:
            print(f"SOAP Parsing Error: {e}")
            print(f"Raw Response causing error: {soap_response}")
            return {
                "SOAP": {
                    "Subjective": "",
                    "Objective": "",
                    "Assessment": "",
                    "Plan": ""
                },
                "confidence": {"overall": 0.0},
                "flags": [f"Parse error: {str(e)}"],
                "raw_response": soap_response
            }
    
    def _parse_json(self, text: str) -> Dict:
        """Extract JSON from response"""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        raise ValueError("No valid JSON found")

class ChatAgent(GeminiAgent):
    """Agent for clinical Q&A using RAG"""
    
    def __init__(self):
        super().__init__(
            name="Clinical Chat Agent",
            role="Clinical Knowledge Assistant",
            goal="Answer clinical queries using contextual information"
        )
    
    def answer_query(self, query: str, context_notes: List[Dict]) -> Dict[str, Any]:
        """Answer a query using similar notes as context"""
        
        if context_notes:
            context = "\n\n".join([
                f"--- Note {i+1} ---\n"
                f"Assessment: {note.get('assessment', 'N/A')}\n"
                f"Plan: {note.get('plan', 'N/A')}\n"
                f"Subjective: {note.get('subjective', 'N/A')}"
                for i, note in enumerate(context_notes[:5])
            ])
            
            prompt = f"""You are a clinical assistant helping healthcare providers.
Use the context from similar patient notes to answer the query.

SIMILAR CLINICAL NOTES:
{context}

USER QUERY:
{query}

INSTRUCTIONS:
1. Base your answer on the provided clinical context
2. Be specific and cite relevant information from the notes
3. If the context doesn't contain relevant information, say so
4. Provide actionable clinical insights when appropriate
5. Always maintain patient confidentiality

ANSWER:"""
        else:
            # No context available - answer based on general clinical knowledge
            prompt = f"""You are a clinical assistant helping healthcare providers.
Answer the following clinical query using your general medical knowledge.

USER QUERY:
{query}

INSTRUCTIONS:
1. Provide helpful, clinically accurate information
2. Be specific and practical
3. If you're unsure, recommend consulting appropriate resources
4. Maintain professional medical standards
5. Always maintain patient confidentiality

ANSWER:"""

        response = self.run(prompt)
        
        return {
            "answer": response,
            "sources_used": len(context_notes) if context_notes else 0,
            "query": query
        }

class AnalyticsAgent(GeminiAgent):
    """Agent for clinical analytics and reporting"""
    
    def __init__(self):
        super().__init__(
            name="Clinical Analytics Agent",
            role="Healthcare Data Analyst",
            goal="Generate insights from structured clinical data"
        )
    
    def analyze_icd_trends(self, icd_data: List[Dict]) -> Dict[str, Any]:
        """Analyze ICD code distribution and trends"""
        
        # Count ICD codes
        code_counts = {}
        for record in icd_data:
            if record.get("icd_json"):
                for code_entry in record["icd_json"]:
                    if isinstance(code_entry, dict) and "code" in code_entry:
                        code = code_entry["code"]
                        code_counts[code] = code_counts.get(code, 0) + 1
        
        # Sort by frequency
        sorted_codes = sorted(code_counts.items(), key=lambda x: x[1], reverse=True)
        top_10 = dict(sorted_codes[:10])
        
        return {
            "total_records": len(icd_data),
            "unique_codes": len(code_counts),
            "top_10_codes": top_10,
            "code_distribution": code_counts
        }
    
    def generate_summary(self, notes_data: List[Dict]) -> str:
        """Generate a summary report of clinical data"""
        
        if not notes_data:
            return "No clinical notes available for analysis."
        
        prompt = f"""Analyze these clinical records and provide a summary report.

DATA SUMMARY:
- Total records: {len(notes_data)}
- Sample assessments: {[n.get('assessment', '')[:100] for n in notes_data[:5]]}

Generate a brief clinical analytics summary including:
1. Common conditions observed
2. Treatment patterns
3. Any notable trends

Keep it concise and professional."""

        return self.run(prompt)

class QualityAgent(GeminiAgent):
    """Agent for quality checks and validation"""
    
    def __init__(self):
        super().__init__(
            name="Quality Assurance Agent",
            role="Clinical Documentation Auditor",
            goal="Ensure completeness and accuracy of structured notes"
        )
    
    def validate_soap(self, soap_data: Dict) -> Dict[str, Any]:
        """Validate SOAP note completeness"""
        
        soap = soap_data.get("SOAP", {})
        issues = []
        scores = {}
        
        # Check each section
        for section in ["Subjective", "Objective", "Assessment", "Plan"]:
            content = soap.get(section, "")
            
            if not content or content.lower() in ["", "not documented", "n/a", "none"]:
                issues.append(f"Missing {section} section")
                scores[section] = 0.0
            elif len(content) < 20:
                issues.append(f"{section} section seems incomplete")
                scores[section] = 0.5
            else:
                scores[section] = 1.0
        
        # Overall score
        scores["overall"] = sum(scores.values()) / len(scores) if scores else 0.0
        
        return {
            "is_valid": len(issues) == 0,
            "completeness_score": scores["overall"],
            "section_scores": scores,
            "issues": issues,
            "recommendations": [
                f"Complete the {issue.split()[1]} section" 
                for issue in issues if "Missing" in issue
            ]
        }

class AgentOrchestrator:
    """Orchestrates multiple agents for clinical note processing"""
    
    def __init__(self):
        self.structuring_agent = StructuringAgent()
        self.chat_agent = ChatAgent()
        self.analytics_agent = AnalyticsAgent()
        self.quality_agent = QualityAgent()
    
    def process_note(self, clinical_text: str) -> Dict[str, Any]:
        """Full pipeline for processing a clinical note"""
        
        # Step 1: Structure the note
        soap_result = self.structuring_agent.extract_soap(clinical_text)
        
        # Step 2: Validate the output
        quality_result = self.quality_agent.validate_soap(soap_result)
        
        # Combine results
        return {
            "soap": soap_result.get("SOAP", {}),
            "confidence": soap_result.get("confidence", {}),
            "entities": soap_result.get("extracted_entities", {}),
            "flags": soap_result.get("flags", []),
            "quality": quality_result
        }
    
    def answer_query(self, query: str, context_notes: List[Dict]) -> Dict[str, Any]:
        """Process a chat query"""
        return self.chat_agent.answer_query(query, context_notes)
    
    def get_analytics(self, notes_data: List[Dict]) -> Dict[str, Any]:
        """Generate analytics from notes"""
        icd_analysis = self.analytics_agent.analyze_icd_trends(notes_data)
        summary = self.analytics_agent.generate_summary(notes_data)
        
        return {
            "icd_stats": icd_analysis,
            "summary": summary
        }

# Create global orchestrator instance
orchestrator = AgentOrchestrator()

def run_full_pipeline_custom(notes_data: List[Dict] = None) -> Dict[str, Any]:
    """Run the full analytics pipeline - replacement for CrewAI"""
    from db_utils import get_all_notes
    
    if notes_data is None:
        notes_data = get_all_notes()
    
    return orchestrator.get_analytics(notes_data)
