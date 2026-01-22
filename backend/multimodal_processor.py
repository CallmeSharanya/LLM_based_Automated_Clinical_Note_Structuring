"""
Multimodal Processing Pipeline
Handles image, PDF, and text document processing with Groq/Gemini Vision API
Uses Groq as PRIMARY LLM to avoid Gemini quota issues
"""

import os
import base64
import json
import tempfile
from typing import List, Dict, Any, Optional
from ocr_utils import extract_text_from_bytes
from utils import deidentify_text

# Try to import Groq (primary LLM)
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("⚠️ Groq not installed.")

# Try to import Gemini (fallback)
try:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Gemini not installed.")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


class MultimodalProcessor:
    """
    Multimodal document processor that handles:
    - Images (JPEG, PNG, WebP) - via Groq Vision or Gemini Vision
    - PDFs - via OCR
    - Text files - direct processing
    
    Uses Groq as PRIMARY to avoid Gemini quota issues
    """
    
    def __init__(self):
        self.use_groq = GROQ_AVAILABLE and GROQ_API_KEY
        if self.use_groq:
            self.groq_client = Groq(api_key=GROQ_API_KEY)
            self.groq_text_model = "llama-3.3-70b-versatile"  # For text processing
            self.groq_vision_model = "llava-v1.5-7b-4096-preview"  # For vision
        
        # Gemini as fallback only
        self.gemini_model = None
        if GEMINI_AVAILABLE:
            try:
                self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
            except:
                print("⚠️ Could not initialize Gemini model")
    
    def _generate_with_groq(self, prompt: str) -> str:
        """Generate text response using Groq (primary LLM)"""
        if not self.use_groq:
            return self._generate_with_gemini(prompt)
        
        try:
            response = self.groq_client.chat.completions.create(
                model=self.groq_text_model,
                messages=[
                    {"role": "system", "content": "You are a clinical documentation specialist. Always respond with valid JSON when asked."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2048
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ Groq text error: {e}")
            return self._generate_with_gemini(prompt)
    
    def _generate_with_gemini(self, prompt: str) -> str:
        """Generate text response using Gemini (fallback)"""
        if not self.gemini_model:
            return "{}"
        
        try:
            response = self.gemini_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"❌ Gemini text error: {e}")
            return "{}"
    
    def process_image_groq(self, image_bytes: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Process image using Groq Vision API (llava-v1.5-7b-4096-preview)
        """
        if not self.use_groq:
            return self.process_image_gemini(image_bytes, mime_type)
        
        try:
            # Encode image to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            # Create message with image
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        },
                        {
                            "type": "text",
                            "text": """Analyze this medical document/image and extract all relevant clinical information.

If this is a medical report, extract:
- Patient demographics (age, gender)
- Test results and values
- Diagnoses mentioned
- Medications listed
- Any abnormal findings

If this is a medical image (X-ray, CT, MRI, ultrasound):
- Describe what you observe
- Note any abnormalities
- Suggest possible findings

Format your response as JSON with the following structure:
{
    "document_type": "lab_report|prescription|medical_image|other",
    "extracted_text": "full text content if readable",
    "findings": ["finding1", "finding2"],
    "values": {"test_name": "value"},
    "medications": ["med1", "med2"],
    "conditions": ["condition1", "condition2"],
    "clinical_notes": "any additional clinical observations"
}"""
                        }
                    ]
                }
            ]
            
            # Call Groq API
            response = self.groq_client.chat.completions.create(
                model="llava-v1.5-7b-4096-preview",
                messages=messages,
                max_tokens=2048,
                temperature=0.2
            )
            
            result_text = response.choices[0].message.content
            
            # Try to parse as JSON
            try:
                # Extract JSON from response
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                else:
                    json_str = result_text
                
                return json.loads(json_str)
            except:
                return {
                    "document_type": "other",
                    "extracted_text": result_text,
                    "findings": [],
                    "clinical_notes": result_text
                }
                
        except Exception as e:
            print(f"❌ Groq vision error: {e}")
            # Fallback to Gemini
            return self.process_image_gemini(image_bytes, mime_type)
    
    def process_image_gemini(self, image_bytes: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Process image using Gemini Vision API
        """
        try:
            # Create image part for Gemini
            image_part = {
                "mime_type": mime_type,
                "data": image_bytes
            }
            
            prompt = """Analyze this medical document/image and extract all relevant clinical information.

If this is a medical report, extract:
- Patient demographics (age, gender)
- Test results and values
- Diagnoses mentioned
- Medications listed
- Any abnormal findings

If this is a medical image (X-ray, CT, MRI, ultrasound):
- Describe what you observe
- Note any abnormalities
- Suggest possible findings

Format your response as JSON with the following structure:
{
    "document_type": "lab_report|prescription|medical_image|other",
    "extracted_text": "full text content if readable",
    "findings": ["finding1", "finding2"],
    "values": {"test_name": "value"},
    "medications": ["med1", "med2"],
    "conditions": ["condition1", "condition2"],
    "clinical_notes": "any additional clinical observations"
}"""
            
            response = self.gemini_model.generate_content([prompt, image_part])
            result_text = response.text
            
            # Parse JSON
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                else:
                    json_str = result_text
                
                return json.loads(json_str)
            except:
                return {
                    "document_type": "other",
                    "extracted_text": result_text,
                    "findings": [],
                    "clinical_notes": result_text
                }
                
        except Exception as e:
            print(f"❌ Gemini vision error: {e}")
            return {
                "document_type": "error",
                "error": str(e),
                "extracted_text": "",
                "findings": []
            }
    
    def process_pdf(self, pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Process PDF using OCR
        """
        try:
            extracted_text = extract_text_from_bytes(pdf_bytes, filename)
            
            if not extracted_text.strip():
                return {
                    "document_type": "pdf",
                    "extracted_text": "",
                    "error": "Could not extract text from PDF"
                }
            
            # De-identify
            clean_text = deidentify_text(extracted_text)
            
            # Analyze with Gemini
            return self.analyze_clinical_text(clean_text)
            
        except Exception as e:
            print(f"❌ PDF processing error: {e}")
            return {
                "document_type": "pdf",
                "error": str(e),
                "extracted_text": ""
            }
    
    def process_text(self, text_content: str) -> Dict[str, Any]:
        """
        Process plain text file
        """
        try:
            clean_text = deidentify_text(text_content)
            return self.analyze_clinical_text(clean_text)
        except Exception as e:
            return {
                "document_type": "text",
                "error": str(e),
                "extracted_text": text_content
            }
    
    def analyze_clinical_text(self, text: str) -> Dict[str, Any]:
        """
        Analyze clinical text and extract structured information
        Uses Groq as primary LLM
        """
        try:
            prompt = f"""Analyze this clinical text and extract structured information:

TEXT:
{text}

Extract and return as JSON:
{{
    "document_type": "clinical_note|lab_report|prescription|referral|other",
    "extracted_text": "cleaned text",
    "patient_info": {{"age": "", "gender": "", "mrn": ""}},
    "chief_complaint": "",
    "symptoms": ["symptom1", "symptom2"],
    "vitals": {{"bp": "", "pulse": "", "temp": "", "spo2": ""}},
    "findings": ["finding1", "finding2"],
    "diagnoses": ["diagnosis1"],
    "medications": [{{"name": "", "dosage": "", "frequency": ""}}],
    "conditions": ["condition1"],
    "lab_values": {{"test": "value"}},
    "clinical_notes": "additional observations"
}}

Return ONLY valid JSON."""
            
            # Use Groq as primary
            result_text = self._generate_with_groq(prompt)
            
            # Parse JSON
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                else:
                    json_str = result_text
                
                return json.loads(json_str)
            except:
                return {
                    "document_type": "other",
                    "extracted_text": text,
                    "clinical_notes": result_text
                }
                
        except Exception as e:
            return {
                "document_type": "error",
                "error": str(e),
                "extracted_text": text
            }
    
    def generate_soap_from_documents(self, processed_docs: List[Dict[str, Any]]) -> Dict[str, str]:
        """
        Generate a draft SOAP note from processed documents
        """
        try:
            # Combine all extracted information
            combined_info = {
                "symptoms": [],
                "findings": [],
                "vitals": {},
                "diagnoses": [],
                "medications": [],
                "lab_values": {},
                "clinical_notes": [],
                "extracted_text": []
            }
            
            for doc in processed_docs:
                # Collect symptoms
                if doc.get("symptoms"):
                    combined_info["symptoms"].extend(doc["symptoms"])
                if doc.get("chief_complaint"):
                    combined_info["symptoms"].append(doc["chief_complaint"])
                    
                # Collect findings
                if doc.get("findings"):
                    combined_info["findings"].extend(doc["findings"])
                    
                # Collect vitals
                if doc.get("vitals"):
                    combined_info["vitals"].update(doc["vitals"])
                    
                # Collect diagnoses
                if doc.get("diagnoses"):
                    combined_info["diagnoses"].extend(doc["diagnoses"])
                if doc.get("conditions"):
                    combined_info["diagnoses"].extend(doc["conditions"])
                    
                # Collect medications
                if doc.get("medications"):
                    combined_info["medications"].extend(doc["medications"])
                    
                # Collect lab values
                if doc.get("lab_values"):
                    combined_info["lab_values"].update(doc["lab_values"])
                if doc.get("values"):
                    combined_info["lab_values"].update(doc["values"])
                    
                # Collect clinical notes
                if doc.get("clinical_notes"):
                    combined_info["clinical_notes"].append(doc["clinical_notes"])
                    
                # Collect extracted text for fallback
                if doc.get("extracted_text"):
                    combined_info["extracted_text"].append(doc["extracted_text"][:1000])
            
            # If we have extracted text but no structured data, use the text directly
            has_structured_data = any([
                combined_info["symptoms"],
                combined_info["findings"],
                combined_info["diagnoses"],
                combined_info["medications"],
                combined_info["lab_values"]
            ])
            
            if not has_structured_data and combined_info["extracted_text"]:
                # Use extracted text directly for SOAP generation
                full_text = "\n".join(combined_info["extracted_text"])
                return self._generate_soap_from_text(full_text)
            
            # Generate SOAP with structured data
            symptoms_str = ', '.join(set(filter(None, combined_info['symptoms']))) or 'Patient symptoms to be documented based on clinical evaluation'
            findings_str = ', '.join(set(filter(None, combined_info['findings']))) or 'Physical examination findings pending'
            vitals_str = json.dumps(combined_info['vitals']) if combined_info['vitals'] else 'Vitals to be recorded'
            labs_str = json.dumps(combined_info['lab_values']) if combined_info['lab_values'] else 'Lab values pending'
            diagnoses_str = ', '.join(set(filter(None, combined_info['diagnoses']))) or 'Diagnosis under evaluation'
            meds_str = json.dumps(combined_info['medications']) if combined_info['medications'] else 'Medications to be reviewed'
            notes_str = ' | '.join(filter(None, combined_info['clinical_notes'])) or 'Clinical notes pending review'
            
            prompt = f"""Based on the following extracted medical information, generate a structured SOAP note:

EXTRACTED INFORMATION:
- Symptoms: {symptoms_str}
- Physical Findings: {findings_str}
- Vitals: {vitals_str}
- Lab Values: {labs_str}
- Possible Diagnoses: {diagnoses_str}
- Current Medications: {meds_str}
- Clinical Notes: {notes_str}

Generate a comprehensive SOAP note in this exact JSON format:
{{
    "Subjective": "Detailed patient-reported symptoms, history, duration, and chief complaint",
    "Objective": "Vital signs, physical exam findings, lab results, and measurable data",
    "Assessment": "Clinical assessment with working diagnosis and differential considerations",
    "Plan": "Treatment plan including medications, tests, follow-up, and patient education"
}}

Important: Make the content professional and clinically appropriate. Do not use placeholder text.
Return ONLY valid JSON."""

            # Use Groq as primary
            result_text = self._generate_with_groq(prompt)
            
            # Parse JSON
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                else:
                    json_str = result_text
                
                return json.loads(json_str)
            except:
                # Return a basic structure if parsing fails
                return {
                    "Subjective": f"Patient presents with: {', '.join(combined_info['symptoms']) or 'symptoms to be documented'}",
                    "Objective": f"Vitals: {json.dumps(combined_info['vitals']) if combined_info['vitals'] else 'To be recorded'}. Labs: {json.dumps(combined_info['lab_values']) if combined_info['lab_values'] else 'Pending'}",
                    "Assessment": f"Working diagnosis: {', '.join(combined_info['diagnoses']) or 'Under evaluation'}",
                    "Plan": "Continue evaluation. Review medications. Follow up as needed."
                }
                
        except Exception as e:
            print(f"❌ SOAP generation error: {e}")
            import traceback
            traceback.print_exc()
            # Return a more useful fallback with any available info
            return {
                "Subjective": "Document review pending - patient information to be extracted from uploaded files",
                "Objective": "Clinical data extraction in progress - please verify uploaded documents",
                "Assessment": "Preliminary assessment pending complete document review",
                "Plan": "1. Review uploaded documents\n2. Complete clinical assessment\n3. Update SOAP note with verified information"
            }
    
    def _generate_soap_from_text(self, text: str) -> Dict[str, str]:
        """
        Generate SOAP directly from extracted text when structured extraction fails
        Uses Groq as primary LLM
        """
        try:
            prompt = f"""You are a medical documentation specialist. Analyze this clinical text and create a SOAP note:

CLINICAL TEXT:
{text[:3000]}

Generate a comprehensive SOAP note in this exact JSON format:
{{
    "Subjective": "Patient's reported symptoms, chief complaint, history of present illness, and relevant medical history",
    "Objective": "Vital signs, physical examination findings, lab results, and imaging findings if mentioned",
    "Assessment": "Clinical assessment with primary diagnosis and differential diagnoses",
    "Plan": "Treatment plan including medications, procedures, follow-up, and patient education"
}}

Extract all relevant clinical information from the text. If certain information is not available, provide clinically appropriate placeholder text.
Return ONLY valid JSON."""

            # Use Groq as primary
            result_text = self._generate_with_groq(prompt)
            
            # Parse JSON
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                else:
                    json_str = result_text
                
                return json.loads(json_str)
            except:
                return {
                    "Subjective": f"Extracted from documents: {text[:200]}...",
                    "Objective": "Further clinical data to be verified",
                    "Assessment": "Assessment pending document review",
                    "Plan": "Complete review and update SOAP note"
                }
                
        except Exception as e:
            print(f"❌ Text-to-SOAP error: {e}")
            return {
                "Subjective": "Document content extracted - clinical review needed",
                "Objective": "Clinical data pending verification",
                "Assessment": "Assessment to be completed by physician",
                "Plan": "Review documents and complete clinical assessment"
            }
    
    def process_conversation_to_soap(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Generate SOAP from conversation history
        Uses Groq as primary LLM
        """
        try:
            # Build conversation context
            conversation_text = "\n".join([
                f"{'Doctor' if msg.get('role') == 'user' else 'AI'}: {msg.get('content', '')}"
                for msg in messages
            ])
            
            prompt = f"""Based on this doctor's clinical documentation conversation, generate a SOAP note:

CONVERSATION:
{conversation_text}

Generate a comprehensive SOAP note in JSON format:
{{
    "Subjective": "Patient's reported symptoms, history, and chief complaint",
    "Objective": "Vital signs, physical exam findings, lab results mentioned",
    "Assessment": "Clinical assessment, differential diagnoses",
    "Plan": "Treatment plan, medications, follow-up recommendations"
}}

Return ONLY valid JSON."""

            # Use Groq as primary
            result_text = self._generate_with_groq(prompt)
            
            # Parse response
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                else:
                    result = json.loads(result_text)
                
                return {
                    "message": "I've updated the SOAP note based on your input. Continue adding details or proceed to edit.",
                    "draft_soap": result
                }
            except:
                return {
                    "message": "I've noted your input. Continue describing the patient's condition for a complete SOAP note.",
                    "draft_soap": None
                }
                
        except Exception as e:
            print(f"❌ Conversation processing error: {e}")
            return {
                "message": "I've recorded your input. Please continue with more details.",
                "draft_soap": None
            }


# Singleton instance
multimodal_processor = MultimodalProcessor()
