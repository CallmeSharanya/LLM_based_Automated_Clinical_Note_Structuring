"""
Dual Validator Agent
Implements comprehensive validation of SOAP notes:
1. Structural Validation - Schema compliance, section integrity
2. Clinical Consistency Validation - Concept coverage, contradiction detection

Uses Groq as primary LLM to avoid Gemini quota issues.
"""

import json
import re
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum
import os

# Try to import Groq (primary LLM)
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("⚠️ Groq not installed for dual validator agent.")

# Try to import Gemini (fallback)
try:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Gemini not installed for dual validator agent.")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")


class ValidationLevel(Enum):
    PASS = "pass"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class ValidationIssue:
    """Represents a validation issue"""
    level: ValidationLevel
    category: str  # 'structural' or 'clinical'
    section: str   # Which SOAP section
    message: str
    suggestion: str = ""


@dataclass
class ValidationResult:
    """Complete validation result"""
    is_valid: bool
    structural_score: float
    clinical_score: float
    completeness_score: float
    overall_score: float
    issues: List[ValidationIssue]
    suggestions: List[str]
    concept_coverage: Dict[str, bool]


class DualValidatorAgent:
    """
    Implements dual-level validation for SOAP notes:
    
    1. STRUCTURAL VALIDATION:
       - Section completeness
       - Schema compliance
       - Chief complaint tracing (CC mentioned in S → appears in A/P)
       - No orphaned plans without assessment
       
    2. CLINICAL CONSISTENCY VALIDATION:
       - Contradiction detection
       - Concept coverage (symptoms from conversation → in SOAP)
       - Medication-diagnosis alignment
       - Red flag verification
       
    Uses Groq as primary LLM for reliability.
    """
    
    # Minimum expected content lengths
    MIN_SECTION_LENGTH = {
        "Subjective": 50,
        "Objective": 30,
        "Assessment": 20,
        "Plan": 20
    }
    
    # Required elements per section
    REQUIRED_ELEMENTS = {
        "Subjective": ["chief complaint", "duration", "history"],
        "Objective": ["examination", "vitals"],
        "Assessment": ["diagnosis", "impression"],
        "Plan": ["treatment", "follow-up"]
    }
    
    def __init__(self, model: str = "llama-3.3-70b-versatile"):
        self.groq_model = model
        self.use_groq = GROQ_AVAILABLE and GROQ_API_KEY
        
        if self.use_groq:
            self.groq_client = Groq(api_key=GROQ_API_KEY)
        
        # Gemini as fallback
        self.gemini_model = None
        if GEMINI_AVAILABLE:
            try:
                self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
            except:
                print("⚠️ Could not initialize Gemini for validator")
    
    def _generate_response(self, prompt: str) -> str:
        """Generate response using Groq (primary) or Gemini (fallback)"""
        # Try Groq first
        if self.use_groq:
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.groq_model,
                    messages=[
                        {"role": "system", "content": "You are a clinical documentation validator. Always respond with valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1024
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Groq error in validator: {e}")
        
        # Fallback to Gemini
        if self.gemini_model:
            try:
                response = self.gemini_model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                print(f"Gemini error in validator: {e}")
        
        return "{}"
    
    def validate_soap(
        self, 
        soap_note: Dict[str, str],
        source_conversation: List[Dict] = None,
        extracted_symptoms: List[str] = None,
        specialty: str = None
    ) -> ValidationResult:
        """
        Perform comprehensive dual-level validation on a SOAP note.
        
        Args:
            soap_note: Dict with Subjective, Objective, Assessment, Plan
            source_conversation: Original patient-bot conversation
            extracted_symptoms: Symptoms extracted from intake
            specialty: Medical specialty for specialty-specific validation
            
        Returns:
            ValidationResult with scores and issues
        """
        
        issues = []
        suggestions = []
        
        # ===== STRUCTURAL VALIDATION =====
        structural_score, structural_issues = self._validate_structural(soap_note)
        issues.extend(structural_issues)
        
        # ===== CLINICAL CONSISTENCY VALIDATION =====
        clinical_score, clinical_issues, concept_coverage = self._validate_clinical(
            soap_note, 
            source_conversation, 
            extracted_symptoms
        )
        issues.extend(clinical_issues)
        
        # ===== COMPLETENESS CHECK =====
        completeness_score = self._calculate_completeness(soap_note)
        
        # ===== CALCULATE OVERALL SCORE =====
        # Weighted: 40% structural + 40% clinical + 20% completeness
        overall_score = (
            0.4 * structural_score +
            0.4 * clinical_score +
            0.2 * completeness_score
        )
        
        # Generate suggestions based on issues
        suggestions = self._generate_suggestions(issues)
        
        # Determine if valid (overall > 70% and no errors)
        has_errors = any(i.level == ValidationLevel.ERROR for i in issues)
        is_valid = overall_score >= 0.7 and not has_errors
        
        return ValidationResult(
            is_valid=is_valid,
            structural_score=round(structural_score, 2),
            clinical_score=round(clinical_score, 2),
            completeness_score=round(completeness_score, 2),
            overall_score=round(overall_score, 2),
            issues=issues,
            suggestions=suggestions,
            concept_coverage=concept_coverage
        )
    
    def _validate_structural(self, soap_note: Dict[str, str]) -> Tuple[float, List[ValidationIssue]]:
        """Validate structural integrity of SOAP note"""
        
        issues = []
        score = 1.0
        sections = ["Subjective", "Objective", "Assessment", "Plan"]
        
        # 1. Check section presence and minimum length
        for section in sections:
            content = soap_note.get(section, "")
            
            if not content or content.strip() == "":
                issues.append(ValidationIssue(
                    level=ValidationLevel.ERROR,
                    category="structural",
                    section=section,
                    message=f"{section} section is missing or empty",
                    suggestion=f"Add content to the {section} section"
                ))
                score -= 0.25
                
            elif len(content) < self.MIN_SECTION_LENGTH.get(section, 20):
                issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    category="structural",
                    section=section,
                    message=f"{section} section seems incomplete ({len(content)} chars)",
                    suggestion=f"Expand the {section} section with more detail"
                ))
                score -= 0.1
        
        # 2. Chief Complaint Tracing
        # Check if complaints in Subjective appear in Assessment/Plan
        subjective = soap_note.get("Subjective", "").lower()
        assessment = soap_note.get("Assessment", "").lower()
        plan = soap_note.get("Plan", "").lower()
        
        # Extract key symptoms from subjective
        cc_result = self._extract_chief_complaints(soap_note.get("Subjective", ""))
        
        for complaint in cc_result.get("complaints", []):
            complaint_lower = complaint.lower()
            # Check if addressed somewhere in Assessment or Plan
            if complaint_lower not in assessment and complaint_lower not in plan:
                # Use fuzzy matching
                if not any(word in assessment or word in plan 
                          for word in complaint_lower.split()):
                    issues.append(ValidationIssue(
                        level=ValidationLevel.WARNING,
                        category="structural",
                        section="Assessment",
                        message=f"Chief complaint '{complaint}' not addressed in Assessment/Plan",
                        suggestion=f"Ensure '{complaint}' is addressed in Assessment or Plan"
                    ))
                    score -= 0.05
        
        # 3. Check for orphaned plans
        # Plans should have corresponding assessments
        plan_items = self._extract_plan_items(soap_note.get("Plan", ""))
        
        for item in plan_items.get("medications", []):
            item_lower = item.lower()
            # Check if there's a diagnosis that warrants this medication
            if not any(word in assessment for word in item_lower.split()):
                issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    category="structural",
                    section="Plan",
                    message=f"Medication '{item}' has no clear indication in Assessment",
                    suggestion=f"Add diagnosis/indication for '{item}' in Assessment"
                ))
                score -= 0.05
        
        # 4. Check SOAP section order/logic
        if soap_note.get("Plan") and not soap_note.get("Assessment"):
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                category="structural",
                section="Assessment",
                message="Plan exists but Assessment is missing",
                suggestion="Add Assessment before creating a Plan"
            ))
            score -= 0.15
        
        return max(0, score), issues
    
    def _validate_clinical(
        self, 
        soap_note: Dict[str, str],
        source_conversation: List[Dict] = None,
        extracted_symptoms: List[str] = None
    ) -> Tuple[float, List[ValidationIssue], Dict[str, bool]]:
        """Validate clinical consistency"""
        
        issues = []
        concept_coverage = {}
        score = 1.0
        
        # 1. Contradiction Detection using LLM
        contradictions = self._detect_contradictions(soap_note)
        
        for contradiction in contradictions:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                category="clinical",
                section=contradiction.get("sections", "Multiple"),
                message=contradiction.get("description", "Clinical contradiction detected"),
                suggestion=contradiction.get("suggestion", "Review and correct the contradiction")
            ))
            score -= 0.15
        
        # 2. Concept Coverage
        # Check if key concepts from intake appear in SOAP
        if extracted_symptoms:
            soap_text = " ".join(soap_note.values()).lower()
            
            for symptom in extracted_symptoms:
                symptom_lower = symptom.lower()
                # Check if symptom or related terms appear in SOAP
                is_covered = symptom_lower in soap_text
                
                # Also check for related terms
                if not is_covered:
                    symptom_words = symptom_lower.split()
                    is_covered = any(word in soap_text for word in symptom_words if len(word) > 3)
                
                concept_coverage[symptom] = is_covered
                
                if not is_covered:
                    issues.append(ValidationIssue(
                        level=ValidationLevel.WARNING,
                        category="clinical",
                        section="Subjective",
                        message=f"Reported symptom '{symptom}' not found in SOAP note",
                        suggestion=f"Include '{symptom}' in the Subjective section"
                    ))
                    score -= 0.05
        
        # 3. Verify conversation coverage
        if source_conversation:
            key_info = self._extract_key_info_from_conversation(source_conversation)
            soap_text = " ".join(soap_note.values()).lower()
            
            for info in key_info:
                if info.lower() not in soap_text:
                    # Check for partial match
                    info_words = info.lower().split()
                    if not any(word in soap_text for word in info_words if len(word) > 3):
                        issues.append(ValidationIssue(
                            level=ValidationLevel.WARNING,
                            category="clinical",
                            section="Subjective",
                            message=f"Patient-reported information not captured: '{info[:50]}...'",
                            suggestion="Ensure all relevant patient information is documented"
                        ))
                        score -= 0.03
        
        # 4. Medication-Diagnosis Alignment
        alignment_issues = self._check_medication_alignment(soap_note)
        issues.extend(alignment_issues)
        score -= len(alignment_issues) * 0.05
        
        return max(0, score), issues, concept_coverage
    
    def _detect_contradictions(self, soap_note: Dict[str, str]) -> List[Dict]:
        """Use LLM to detect clinical contradictions"""
        
        prompt = f"""Analyze this SOAP note for clinical contradictions or inconsistencies.

SOAP NOTE:
Subjective: {soap_note.get('Subjective', 'N/A')}
Objective: {soap_note.get('Objective', 'N/A')}
Assessment: {soap_note.get('Assessment', 'N/A')}
Plan: {soap_note.get('Plan', 'N/A')}

Look for:
1. Contradictions between sections (e.g., "denies pain" in S but "pain management" in P)
2. Assessment not supported by Subjective/Objective findings
3. Plan items that contradict the Assessment
4. Medication contraindications mentioned
5. Vital signs that don't match described clinical status

Return as JSON:
{{
  "contradictions": [
    {{
      "description": "Description of the contradiction",
      "sections": "Which sections are involved",
      "severity": "low|medium|high",
      "suggestion": "How to fix it"
    }}
  ],
  "no_issues": true/false
}}

If no contradictions found, return {{"contradictions": [], "no_issues": true}}
Return ONLY valid JSON."""

        result = self._generate_response(prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            return parsed.get("contradictions", [])
        except:
            return []
    
    def _extract_chief_complaints(self, subjective: str) -> Dict[str, List[str]]:
        """Extract chief complaints from subjective section"""
        
        if not subjective:
            return {"complaints": []}
        
        prompt = f"""Extract the main chief complaints/symptoms from this Subjective text.

TEXT: {subjective}

Return as JSON:
{{"complaints": ["complaint1", "complaint2"]}}

Return ONLY the main symptoms/complaints as a list.
Return ONLY valid JSON."""

        result = self._generate_response(prompt)
        
        try:
            return json.loads(result.replace("```json", "").replace("```", "").strip())
        except:
            return {"complaints": []}
    
    def _extract_plan_items(self, plan: str) -> Dict[str, List[str]]:
        """Extract plan items from plan section"""
        
        if not plan:
            return {"medications": [], "tests": [], "follow_ups": []}
        
        prompt = f"""Extract plan items from this Plan text.

TEXT: {plan}

Return as JSON:
{{
  "medications": ["medication names"],
  "tests": ["ordered tests"],
  "follow_ups": ["follow up instructions"]
}}

Return ONLY valid JSON."""

        result = self._generate_response(prompt)
        
        try:
            return json.loads(result.replace("```json", "").replace("```", "").strip())
        except:
            return {"medications": [], "tests": [], "follow_ups": []}
    
    def _extract_key_info_from_conversation(self, conversation: List[Dict]) -> List[str]:
        """Extract key clinical information from conversation"""
        
        # Get patient messages only
        patient_messages = [
            msg.get("content", "") 
            for msg in conversation 
            if msg.get("role") == "user"
        ]
        
        if not patient_messages:
            return []
        
        combined = " | ".join(patient_messages[:5])  # First 5 messages
        
        prompt = f"""Extract key clinical information from these patient messages.

MESSAGES: {combined}

Return as JSON:
{{"key_info": ["important fact 1", "important fact 2", ...]}}

Focus on symptoms, duration, severity, medical history mentioned.
Return ONLY valid JSON."""

        result = self._generate_response(prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            return parsed.get("key_info", [])
        except:
            return []
    
    def _check_medication_alignment(self, soap_note: Dict[str, str]) -> List[ValidationIssue]:
        """Check if medications align with diagnoses"""
        
        issues = []
        plan = soap_note.get("Plan", "")
        assessment = soap_note.get("Assessment", "")
        
        if not plan or not assessment:
            return issues
        
        prompt = f"""Check if medications in the Plan align with diagnoses in Assessment.

ASSESSMENT: {assessment}
PLAN: {plan}

Check for:
1. Medications without clear indication in the diagnosis
2. Diagnoses without corresponding treatment in plan
3. Potential contraindications

Return as JSON:
{{
  "issues": [
    {{
      "type": "unindicated_medication|untreated_diagnosis|contraindication",
      "item": "medication or diagnosis name",
      "concern": "description of issue"
    }}
  ],
  "alignment_ok": true/false
}}

Return ONLY valid JSON."""

        result = self._generate_response(prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            
            for issue in parsed.get("issues", []):
                issues.append(ValidationIssue(
                    level=ValidationLevel.WARNING,
                    category="clinical",
                    section="Plan",
                    message=f"{issue.get('type', 'Issue')}: {issue.get('item', '')} - {issue.get('concern', '')}",
                    suggestion="Review medication-diagnosis alignment"
                ))
        except:
            pass
        
        return issues
    
    def _calculate_completeness(self, soap_note: Dict[str, str]) -> float:
        """Calculate overall completeness score"""
        
        score = 0.0
        sections = ["Subjective", "Objective", "Assessment", "Plan"]
        
        for section in sections:
            content = soap_note.get(section, "")
            min_len = self.MIN_SECTION_LENGTH.get(section, 20)
            
            if content:
                # Score based on length (up to 2x minimum = full score)
                length_ratio = min(1.0, len(content) / (min_len * 2))
                score += length_ratio * 0.25
        
        return score
    
    def _generate_suggestions(self, issues: List[ValidationIssue]) -> List[str]:
        """Generate improvement suggestions based on issues"""
        
        suggestions = []
        
        # Group issues by category
        structural_count = sum(1 for i in issues if i.category == "structural")
        clinical_count = sum(1 for i in issues if i.category == "clinical")
        error_count = sum(1 for i in issues if i.level == ValidationLevel.ERROR)
        
        if error_count > 0:
            suggestions.append(f"⚠️ {error_count} critical issue(s) need immediate attention")
        
        if structural_count > 2:
            suggestions.append("📋 Review SOAP structure - ensure all sections are complete and connected")
        
        if clinical_count > 2:
            suggestions.append("🏥 Review clinical content - ensure all patient information is accurately captured")
        
        # Add unique suggestions from issues
        unique_suggestions = set(i.suggestion for i in issues if i.suggestion)
        suggestions.extend(list(unique_suggestions)[:5])
        
        return suggestions
    
    def get_validation_summary(self, result: ValidationResult) -> Dict[str, Any]:
        """Get a formatted summary of validation results"""
        
        status_emoji = "✅" if result.is_valid else "⚠️"
        
        return {
            "status": "VALID" if result.is_valid else "NEEDS REVIEW",
            "status_emoji": status_emoji,
            "scores": {
                "overall": f"{result.overall_score:.0%}",
                "structural": f"{result.structural_score:.0%}",
                "clinical": f"{result.clinical_score:.0%}",
                "completeness": f"{result.completeness_score:.0%}"
            },
            "issue_count": {
                "errors": sum(1 for i in result.issues if i.level == ValidationLevel.ERROR),
                "warnings": sum(1 for i in result.issues if i.level == ValidationLevel.WARNING)
            },
            "issues": [
                {
                    "level": issue.level.value,
                    "category": issue.category,
                    "section": issue.section,
                    "message": issue.message
                }
                for issue in result.issues
            ],
            "suggestions": result.suggestions,
            "concept_coverage": result.concept_coverage
        }


# Create global instance
dual_validator = DualValidatorAgent()
