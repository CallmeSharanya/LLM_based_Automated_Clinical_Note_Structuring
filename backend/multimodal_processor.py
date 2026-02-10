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
import requests
from gradio_client import Client

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
        Process image using Groq Vision API
        Updated to use llama-4-scout for vision (llava is deprecated)
        Falls back to OCR if vision fails
        """
        # First try Groq vision with new model
        if self.use_groq:
            try:
                # Encode image to base64
                base64_image = base64.b64encode(image_bytes).decode('utf-8')
                
                # Create message with image - using Llama 4 Scout (multimodal)
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
                                "text": """Analyze this medical document/image and extract ONLY the information that is ACTUALLY VISIBLE in it.

IMPORTANT RULES:
1. ONLY extract information that you can SEE in the image
2. Do NOT invent or make up any values (vitals, demographics, etc.) that are not visible
3. If information is not present, use "N/A" or leave the field empty
4. For X-rays/CT/MRI/ultrasound images: ONLY describe what you observe in the image itself

If this is a medical report or prescription, extract ONLY what is written:
- Patient demographics (if visible)
- Date (if visible)
- Chief complaint or symptoms (if written)
- Diagnosis/findings (if written)
- Medications with dosages (if written)
- Vital signs ONLY if printed/written on the document
- Test results and values (if shown)

If this is a medical imaging (X-ray, CT, MRI, ultrasound):
- Describe ONLY what you can observe in the image
- Note any abnormalities, fractures, lesions visible
- Do NOT make up patient symptoms or vitals - they cannot be seen in an X-ray

Format your response as JSON:
{
    "document_type": "prescription|lab_report|medical_image|xray|ct_scan|mri|ultrasound|discharge_summary|other",
    "extracted_text": "text content you can READ from the document (N/A for pure images)",
    "patient_info": {"name": "N/A if not visible", "age": "N/A if not visible", "gender": "N/A if not visible"},
    "date": "N/A if not visible",
    "hospital": "N/A if not visible",
    "chief_complaint": "N/A if not visible - do NOT invent symptoms",
    "diagnoses": ["only findings visible in the image"],
    "vitals": {"bp": "N/A", "pulse": "N/A", "temp": "N/A"},
    "medications": [],
    "findings": ["describe what you OBSERVE in the image"],
    "image_observations": "for X-rays/CT/MRI - detailed description of what is visible",
    "clinical_notes": "observations based ONLY on what is visible"
}"""
                            }
                        ]
                    }
                ]
                
                # Try Llama 4 Scout first (multimodal capable)
                try:
                    response = self.groq_client.chat.completions.create(
                        model="meta-llama/llama-4-scout-17b-16e-instruct",
                        messages=messages,
                        max_tokens=2048,
                        temperature=0.2
                    )
                    result_text = response.choices[0].message.content
                except Exception as e1:
                    print(f"⚠️ Llama 4 Scout failed: {e1}")
                    # Try Llama 3.2 vision as backup
                    try:
                        response = self.groq_client.chat.completions.create(
                            model="llama-3.2-11b-vision-preview",
                            messages=messages,
                            max_tokens=2048,
                            temperature=0.2
                        )
                        result_text = response.choices[0].message.content
                    except Exception as e2:
                        print(f"⚠️ Llama 3.2 vision failed: {e2}")
                        raise e2
                
                # Try to parse as JSON
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
                print(f"❌ Groq vision error: {e}")
        
        # Fallback to OCR-based extraction for images
        print("📄 Falling back to OCR for image processing...")
        try:
            extracted_text = extract_text_from_bytes(image_bytes, "image.png")
            if extracted_text and extracted_text.strip():
                print(f"✅ OCR extracted {len(extracted_text)} characters")
                # Analyze the OCR text with Groq
                return self.analyze_clinical_text(extracted_text)
            else:
                print("⚠️ OCR returned empty text, trying Gemini vision...")
        except Exception as ocr_error:
            print(f"⚠️ OCR failed: {ocr_error}")
        
        # Final fallback to Gemini
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
        Process PDF using hybrid approach:
        1. Try to extract embedded text (for digital PDFs)
        2. For scanned pages, use Vision AI (better for handwritten content)
        3. Fall back to Tesseract OCR if Vision AI fails
        """
        try:
            import fitz  # PyMuPDF
            import io
            
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            all_results = []
            combined_text = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # First try to extract embedded text (works for digital PDFs)
                text = page.get_text()
                
                if text.strip() and len(text.strip()) > 50:
                    # Good amount of embedded text found
                    print(f"📄 Page {page_num + 1}: Extracted {len(text)} chars of embedded text")
                    combined_text.append(text)
                else:
                    # Scanned page - convert to image and use Vision AI
                    print(f"📄 Page {page_num + 1}: Scanned page, using Vision AI...")
                    
                    # Render page to image at 200 DPI
                    mat = fitz.Matrix(200/72, 200/72)
                    pix = page.get_pixmap(matrix=mat)
                    img_bytes = pix.tobytes("png")
                    
                    # Use Vision AI for better handwriting recognition
                    vision_result = self.process_image_groq(img_bytes, "image/png")
                    
                    if vision_result.get("extracted_text"):
                        combined_text.append(vision_result["extracted_text"])
                        all_results.append(vision_result)
                        print(f"✅ Vision AI extracted: {len(vision_result.get('extracted_text', ''))} chars")
                    elif vision_result.get("clinical_notes"):
                        combined_text.append(vision_result["clinical_notes"])
                        all_results.append(vision_result)
                    else:
                        # Vision AI didn't get text, try OCR as fallback
                        print(f"⚠️ Vision AI returned no text, trying OCR...")
                        try:
                            from PIL import Image
                            import pytesseract
                            image = Image.open(io.BytesIO(img_bytes))
                            ocr_text = pytesseract.image_to_string(image, lang='eng')
                            if ocr_text.strip():
                                combined_text.append(ocr_text)
                        except Exception as ocr_err:
                            print(f"⚠️ OCR also failed: {ocr_err}")
            
            doc.close()
            
            # Combine all extracted text
            full_text = "\n".join(combined_text)
            
            if not full_text.strip():
                return {
                    "document_type": "pdf",
                    "extracted_text": "",
                    "error": "Could not extract text from PDF"
                }
            
            # If we got structured results from Vision AI, merge them
            if all_results:
                merged = {
                    "document_type": "pdf",
                    "extracted_text": full_text,
                    "findings": [],
                    "diagnoses": [],
                    "medications": [],
                    "vitals": {},
                    "clinical_notes": ""
                }
                for result in all_results:
                    if result.get("findings"):
                        merged["findings"].extend(result["findings"])
                    if result.get("diagnoses"):
                        merged["diagnoses"].extend(result["diagnoses"])
                    if result.get("medications"):
                        merged["medications"].extend(result["medications"])
                    if result.get("vitals"):
                        merged["vitals"].update(result["vitals"])
                    if result.get("clinical_notes"):
                        merged["clinical_notes"] += " " + result["clinical_notes"]
                    if result.get("chief_complaint"):
                        merged["chief_complaint"] = result["chief_complaint"]
                    if result.get("patient_info"):
                        merged["patient_info"] = result["patient_info"]
                
                return merged
            
            # Otherwise, analyze the combined text
            clean_text = deidentify_text(full_text)
            return self.analyze_clinical_text(clean_text)
            
        except ImportError:
            # PyMuPDF not available, fall back to basic OCR
            extracted_text = extract_text_from_bytes(pdf_bytes, filename)
            if extracted_text.strip():
                clean_text = deidentify_text(extracted_text)
                return self.analyze_clinical_text(clean_text)
            return {
                "document_type": "pdf",
                "error": "PyMuPDF not installed",
                "extracted_text": ""
            }
            
        except Exception as e:
            print(f"❌ PDF processing error: {e}")
            import traceback
            traceback.print_exc()
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

Generate a comprehensive SOAP note in JSON format, where each section contains NARRATIVE TEXT (paragraphs or bullet points), not nested JSON objects.

{{
    "Subjective": "Patient is a 45yo male presenting with... (narrative description)",
    "Objective": "Vitals: BP 120/80... Physical Exam: Lungs clear... (narrative description)",
    "Assessment": "Primary diagnosis: Hypertension... (narrative description)",
    "Plan": "1. Start Meds... 2. Follow up... (narrative description)"
}}

IMPORTANT RULES:
1. Do NOT use nested JSON objects inside the sections.
2. Use plain text, bullet points (• or -), and newlines for readability.
3. Combine vitals into a single readable string (e.g., "BP 120/80, HR 72").
4. List medications in a readable sentence or list.

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

    def extract_soap_from_tinyllama(self, conversation_text: str) -> Dict[str, Any]:
        """
        Extract SOAP note from conversation using external TinyLlama API (via Gradio Client)
        """
        SPACE_NAME = "Shreya5619/soap-tinyllama-api"
        
        try:
            print(f"🚀 Calling TinyLlama HF Space: {SPACE_NAME}...")
            # Use Gradio Client for more robust interaction with HF Spaces
            client = Client(SPACE_NAME)
            result = client.predict(conversation_text)
            
            # The result from this specific space is a string containing the SOAP note
            soap_note = result
            
            if soap_note:
                print(f"✅ Received response from TinyLlama")
                # TinyLlama might return a raw string or a structured object.
                # Usually these space-based APIs return a string if it's a simple extractor.
                # If it's a string, we might need to parse it if we want structured JSON.
                # However, your system expects a Dict with Subjective, Objective, Assessment, Plan.
                
                # Let's try to parse it if it looks like JSON, otherwise return as is
                if isinstance(soap_note, str):
                    try:
                        # Try to find JSON in the string
                        start = soap_note.find('{')
                        end = soap_note.rfind('}') + 1
                        if start >= 0 and end > start:
                            json_str = soap_note[start:end]
                            return json.loads(json_str)
                    except:
                        pass
                    
                    # If not JSON, we can try to split by section headers
                    sections = {
                        "Subjective": ["subjective", "s:"],
                        "Objective": ["objective", "o:"],
                        "Assessment": ["assessment", "a:"],
                        "Plan": ["plan", "p:"]
                    }
                    structured = {}
                    current_section = None
                    lines = soap_note.split("\n")
                    
                    for line in lines:
                        cleaned_line = line.strip().lower()
                        found = False
                        for s_name, variants in sections.items():
                            for var in variants:
                                if cleaned_line.startswith(var) or cleaned_line.startswith(f"**{var}**"):
                                    current_section = s_name
                                    structured[s_name] = line.split(":", 1)[1].strip() if ":" in line else ""
                                    found = True
                                    break
                            if found: break
                        
                        if not found and current_section:
                            structured[current_section] = structured.get(current_section, "") + "\n" + line
                    
                    if structured:
                        return structured
                    
                    # If all else fails, return the raw note in Subjective or split it roughly
                    return {
                        "Subjective": soap_note,
                        "Objective": "See Subjective",
                        "Assessment": "See Subjective",
                        "Plan": "See Subjective"
                    }
                
                return soap_note
            else:
                return None
        except Exception as e:
            print(f"❌ Error calling TinyLlama API: {e}")
            return None


# Singleton instance
multimodal_processor = MultimodalProcessor()
