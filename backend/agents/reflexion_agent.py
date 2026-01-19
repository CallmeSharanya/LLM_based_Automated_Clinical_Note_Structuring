"""
Reflexion/Learning Agent
Implements continuous learning from doctor edits to improve SOAP generation.
Uses the Reflexion pattern to analyze feedback and optimize prompts.
"""

import json
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict
import difflib

import google.generativeai as genai
import os

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


@dataclass
class EditLog:
    """Represents a single edit log entry"""
    encounter_id: str
    doctor_id: str
    specialty: str
    original_soap: Dict[str, str]
    edited_soap: Dict[str, str]
    sections_edited: List[str]
    edit_distance: float
    edit_category: str
    edit_severity: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class LearningInsight:
    """Insight derived from edit analysis"""
    category: str
    insight: str
    frequency: int
    suggested_prompt_update: str
    specialty: Optional[str] = None
    confidence: float = 0.0


class ReflexionAgent:
    """
    Implements the Reflexion pattern for continuous learning.
    
    Features:
    1. Edit Tracking - Log all doctor modifications to AI-generated SOAP
    2. Pattern Analysis - Identify common correction patterns
    3. Prompt Optimization - Generate improved prompts based on feedback
    4. Specialty-Specific Learning - Learn specialty-specific patterns
    5. Performance Metrics - Track improvement over time
    """
    
    def __init__(self, model: str = "gemini-2.0-flash"):
        self.model = genai.GenerativeModel(model)
        self.edit_logs: List[EditLog] = []
        self.insights: List[LearningInsight] = []
        self.prompt_improvements: Dict[str, List[str]] = defaultdict(list)
        
        # Track metrics per specialty
        self.specialty_metrics: Dict[str, Dict] = defaultdict(lambda: {
            "total_edits": 0,
            "avg_edit_distance": 0.0,
            "common_issues": [],
            "improvement_trend": []
        })
    
    def _generate_response(self, prompt: str) -> str:
        """Generate response using Gemini"""
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Error generating response: {e}")
            return "{}"
    
    def log_edit(
        self,
        encounter_id: str,
        doctor_id: str,
        specialty: str,
        original_soap: Dict[str, str],
        edited_soap: Dict[str, str]
    ) -> EditLog:
        """
        Log a doctor's edit to an AI-generated SOAP note.
        Analyzes the diff and categorizes the edit.
        """
        
        # Calculate sections that were edited
        sections_edited = []
        for section in ["Subjective", "Objective", "Assessment", "Plan"]:
            orig = original_soap.get(section, "")
            edited = edited_soap.get(section, "")
            if orig != edited:
                sections_edited.append(section)
        
        # Calculate edit distance
        edit_distance = self._calculate_edit_distance(original_soap, edited_soap)
        
        # Categorize the edit
        edit_category, edit_severity = self._categorize_edit(
            original_soap, edited_soap, sections_edited
        )
        
        # Create log entry
        log = EditLog(
            encounter_id=encounter_id,
            doctor_id=doctor_id,
            specialty=specialty,
            original_soap=original_soap,
            edited_soap=edited_soap,
            sections_edited=sections_edited,
            edit_distance=edit_distance,
            edit_category=edit_category,
            edit_severity=edit_severity
        )
        
        self.edit_logs.append(log)
        
        # Update specialty metrics
        self._update_specialty_metrics(specialty, log)
        
        return log
    
    def _calculate_edit_distance(
        self,
        original: Dict[str, str],
        edited: Dict[str, str]
    ) -> float:
        """Calculate normalized edit distance between SOAPs"""
        
        original_text = " ".join(original.values())
        edited_text = " ".join(edited.values())
        
        # Use SequenceMatcher for similarity
        similarity = difflib.SequenceMatcher(
            None, original_text, edited_text
        ).ratio()
        
        # Return as distance (1 - similarity)
        return round(1 - similarity, 3)
    
    def _categorize_edit(
        self,
        original: Dict[str, str],
        edited: Dict[str, str],
        sections_edited: List[str]
    ) -> Tuple[str, str]:
        """Categorize the type and severity of edit"""
        
        # Calculate total change magnitude
        orig_len = sum(len(v) for v in original.values())
        edit_len = sum(len(v) for v in edited.values())
        
        len_diff = abs(edit_len - orig_len)
        len_change_ratio = len_diff / max(orig_len, 1)
        
        # Determine severity
        if len_change_ratio < 0.1 and len(sections_edited) <= 1:
            severity = "minor"
        elif len_change_ratio < 0.3 and len(sections_edited) <= 2:
            severity = "moderate"
        else:
            severity = "major"
        
        # Use LLM to categorize type
        prompt = f"""Categorize this doctor's edit to an AI-generated SOAP note.

ORIGINAL:
{json.dumps(original, indent=2)}

EDITED:
{json.dumps(edited, indent=2)}

SECTIONS CHANGED: {sections_edited}

Categories:
- correction: Fixing factual errors or misinterpretations
- addition: Adding missing information
- removal: Removing incorrect or irrelevant information
- clarification: Rewording for clarity without changing meaning
- style: Formatting or stylistic preferences
- clinical_judgment: Changes based on clinical expertise

Return as JSON:
{{"category": "category_name", "reason": "brief explanation"}}

Return ONLY valid JSON."""

        result = self._generate_response(prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            category = parsed.get("category", "correction")
        except:
            category = "correction"
        
        return category, severity
    
    def _update_specialty_metrics(self, specialty: str, log: EditLog):
        """Update running metrics for a specialty"""
        
        metrics = self.specialty_metrics[specialty]
        metrics["total_edits"] += 1
        
        # Update rolling average edit distance
        n = metrics["total_edits"]
        old_avg = metrics["avg_edit_distance"]
        metrics["avg_edit_distance"] = old_avg + (log.edit_distance - old_avg) / n
        
        # Track improvement trend (lower edit distance = better)
        metrics["improvement_trend"].append({
            "timestamp": log.timestamp.isoformat(),
            "edit_distance": log.edit_distance
        })
        
        # Keep only last 100 entries
        if len(metrics["improvement_trend"]) > 100:
            metrics["improvement_trend"] = metrics["improvement_trend"][-100:]
    
    def analyze_patterns(self, specialty: str = None) -> Dict[str, Any]:
        """
        Analyze edit patterns to identify common issues.
        Can be filtered by specialty.
        """
        
        # Filter logs by specialty if specified
        logs = self.edit_logs
        if specialty:
            logs = [l for l in logs if l.specialty == specialty]
        
        if not logs:
            return {"message": "No edit logs available for analysis"}
        
        # Aggregate statistics
        section_edits = defaultdict(int)
        category_counts = defaultdict(int)
        severity_counts = defaultdict(int)
        
        for log in logs:
            for section in log.sections_edited:
                section_edits[section] += 1
            category_counts[log.edit_category] += 1
            severity_counts[log.edit_severity] += 1
        
        # Calculate percentages
        total = len(logs)
        
        analysis = {
            "total_edits_analyzed": total,
            "specialty": specialty or "all",
            "sections_most_edited": dict(sorted(
                section_edits.items(),
                key=lambda x: x[1],
                reverse=True
            )),
            "edit_categories": {
                k: {"count": v, "percentage": round(v/total*100, 1)}
                for k, v in category_counts.items()
            },
            "severity_distribution": {
                k: {"count": v, "percentage": round(v/total*100, 1)}
                for k, v in severity_counts.items()
            },
            "avg_edit_distance": round(
                sum(l.edit_distance for l in logs) / total, 3
            )
        }
        
        return analysis
    
    def generate_insights(self, specialty: str = None) -> List[LearningInsight]:
        """Generate actionable insights from edit patterns"""
        
        logs = self.edit_logs
        if specialty:
            logs = [l for l in logs if l.specialty == specialty]
        
        if len(logs) < 5:
            return [LearningInsight(
                category="insufficient_data",
                insight="Need more edit logs to generate insights (minimum 5)",
                frequency=0,
                suggested_prompt_update="",
                confidence=0.0
            )]
        
        # Prepare sample edits for analysis
        sample_logs = logs[-10:]  # Last 10 edits
        
        samples_text = "\n\n".join([
            f"Edit {i+1}:\n"
            f"Specialty: {log.specialty}\n"
            f"Sections Changed: {log.sections_edited}\n"
            f"Category: {log.edit_category}\n"
            f"Original: {json.dumps(log.original_soap)}\n"
            f"Edited: {json.dumps(log.edited_soap)}"
            for i, log in enumerate(sample_logs)
        ])
        
        prompt = f"""Analyze these doctor edits to AI-generated SOAP notes and identify patterns.

EDIT SAMPLES:
{samples_text}

Identify:
1. Common patterns in what doctors are changing
2. Recurring issues in AI-generated content
3. Specialty-specific patterns (if applicable)
4. Suggestions for improving the AI prompts

Return as JSON:
{{
  "insights": [
    {{
      "category": "content|structure|terminology|completeness|accuracy",
      "insight": "Description of the pattern observed",
      "frequency": "how often this occurs (1-10)",
      "specialty_specific": "specialty name or null",
      "suggested_prompt_update": "How to modify the SOAP generation prompt to address this",
      "confidence": 0.0-1.0
    }}
  ],
  "overall_recommendation": "Top priority improvement to make"
}}

Return ONLY valid JSON."""

        result = self._generate_response(prompt)
        
        try:
            parsed = json.loads(result.replace("```json", "").replace("```", "").strip())
            
            insights = []
            for item in parsed.get("insights", []):
                insights.append(LearningInsight(
                    category=item.get("category", "general"),
                    insight=item.get("insight", ""),
                    frequency=int(item.get("frequency", 1)),
                    suggested_prompt_update=item.get("suggested_prompt_update", ""),
                    specialty=item.get("specialty_specific"),
                    confidence=float(item.get("confidence", 0.5))
                ))
            
            self.insights = insights
            return insights
            
        except Exception as e:
            print(f"Error generating insights: {e}")
            return []
    
    def get_prompt_improvements(self, specialty: str = None) -> Dict[str, str]:
        """
        Generate improved prompts based on learned patterns.
        Returns suggested modifications to SOAP generation prompts.
        """
        
        insights = self.generate_insights(specialty)
        
        if not insights:
            return {"message": "No improvements available yet"}
        
        # Filter high-confidence insights
        actionable = [i for i in insights if i.confidence >= 0.6]
        
        improvements = {
            "base_improvements": [],
            "specialty_improvements": defaultdict(list)
        }
        
        for insight in actionable:
            improvement = {
                "issue": insight.insight,
                "prompt_modification": insight.suggested_prompt_update
            }
            
            if insight.specialty:
                improvements["specialty_improvements"][insight.specialty].append(improvement)
            else:
                improvements["base_improvements"].append(improvement)
        
        # Generate consolidated prompt update
        if improvements["base_improvements"]:
            prompt = f"""Based on these identified issues with SOAP note generation:

{json.dumps(improvements['base_improvements'], indent=2)}

Generate a set of additional instructions to add to the SOAP generation prompt.
Format as a bullet list of rules/guidelines.
Be specific and actionable.
Return ONLY the bullet list, no explanation."""

            additional_rules = self._generate_response(prompt)
            improvements["consolidated_prompt_addition"] = additional_rules
        
        return dict(improvements)
    
    def get_performance_metrics(self, specialty: str = None) -> Dict[str, Any]:
        """Get performance metrics showing improvement over time"""
        
        if specialty:
            if specialty not in self.specialty_metrics:
                return {"message": f"No data for specialty: {specialty}"}
            
            metrics = self.specialty_metrics[specialty]
            trend = metrics.get("improvement_trend", [])
            
            if len(trend) >= 2:
                # Calculate improvement
                first_half = trend[:len(trend)//2]
                second_half = trend[len(trend)//2:]
                
                first_avg = sum(t["edit_distance"] for t in first_half) / len(first_half)
                second_avg = sum(t["edit_distance"] for t in second_half) / len(second_half)
                
                improvement = ((first_avg - second_avg) / first_avg) * 100 if first_avg > 0 else 0
            else:
                improvement = 0
            
            return {
                "specialty": specialty,
                "total_edits": metrics["total_edits"],
                "current_avg_edit_distance": round(metrics["avg_edit_distance"], 3),
                "improvement_percentage": round(improvement, 1),
                "trend_data": trend[-20:]  # Last 20 data points
            }
        
        else:
            # Aggregate across all specialties
            total_edits = sum(m["total_edits"] for m in self.specialty_metrics.values())
            
            if total_edits == 0:
                return {"message": "No edit data available"}
            
            weighted_avg = sum(
                m["avg_edit_distance"] * m["total_edits"]
                for m in self.specialty_metrics.values()
            ) / total_edits
            
            return {
                "total_edits": total_edits,
                "specialties_tracked": list(self.specialty_metrics.keys()),
                "overall_avg_edit_distance": round(weighted_avg, 3),
                "specialty_breakdown": {
                    k: {
                        "edits": v["total_edits"],
                        "avg_edit_distance": round(v["avg_edit_distance"], 3)
                    }
                    for k, v in self.specialty_metrics.items()
                }
            }
    
    def export_learning_data(self) -> Dict[str, Any]:
        """Export all learning data for persistence"""
        
        return {
            "edit_logs": [
                {
                    "encounter_id": log.encounter_id,
                    "doctor_id": log.doctor_id,
                    "specialty": log.specialty,
                    "original_soap": log.original_soap,
                    "edited_soap": log.edited_soap,
                    "sections_edited": log.sections_edited,
                    "edit_distance": log.edit_distance,
                    "edit_category": log.edit_category,
                    "edit_severity": log.edit_severity,
                    "timestamp": log.timestamp.isoformat()
                }
                for log in self.edit_logs
            ],
            "specialty_metrics": dict(self.specialty_metrics),
            "insights": [
                {
                    "category": i.category,
                    "insight": i.insight,
                    "frequency": i.frequency,
                    "suggested_prompt_update": i.suggested_prompt_update,
                    "specialty": i.specialty,
                    "confidence": i.confidence
                }
                for i in self.insights
            ],
            "exported_at": datetime.now().isoformat()
        }
    
    def import_learning_data(self, data: Dict[str, Any]):
        """Import previously saved learning data"""
        
        # Import edit logs
        for log_data in data.get("edit_logs", []):
            log = EditLog(
                encounter_id=log_data["encounter_id"],
                doctor_id=log_data["doctor_id"],
                specialty=log_data["specialty"],
                original_soap=log_data["original_soap"],
                edited_soap=log_data["edited_soap"],
                sections_edited=log_data["sections_edited"],
                edit_distance=log_data["edit_distance"],
                edit_category=log_data["edit_category"],
                edit_severity=log_data["edit_severity"],
                timestamp=datetime.fromisoformat(log_data["timestamp"])
            )
            self.edit_logs.append(log)
        
        # Import specialty metrics
        for specialty, metrics in data.get("specialty_metrics", {}).items():
            self.specialty_metrics[specialty].update(metrics)
        
        # Import insights
        for insight_data in data.get("insights", []):
            self.insights.append(LearningInsight(
                category=insight_data["category"],
                insight=insight_data["insight"],
                frequency=insight_data["frequency"],
                suggested_prompt_update=insight_data["suggested_prompt_update"],
                specialty=insight_data.get("specialty"),
                confidence=insight_data.get("confidence", 0.5)
            ))


# Create global instance
reflexion_agent = ReflexionAgent()
