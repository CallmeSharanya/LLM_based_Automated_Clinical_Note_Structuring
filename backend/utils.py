# utils.py
import re

def deidentify_text(text: str) -> str:
    """
    Very basic redaction/pseudonymization.
    Replace names that look like 'Firstname Lastname', phone numbers, emails, MRNs, dates.
    For real PHI use production-grade DLP or Amazon Comprehend Medical.
    """
    x = text
    # emails
    x = re.sub(r'[\w\.-]+@[\w\.-]+', '[REDACTED_EMAIL]', x)
    # phone numbers (simple)
    x = re.sub(r'\b\d{10}\b', '[REDACTED_PHONE]', x)
    x = re.sub(r'\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b', '[REDACTED_PHONE]', x)
    # dates (YYYY/MM/DD or DD/MM/YYYY or common)
    x = re.sub(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', '[REDACTED_DATE]', x)
    # Simple name pattern: Title Case two words (risk of false positives)
    x = re.sub(r'\b[A-Z][a-z]{1,20}\s[A-Z][a-z]{1,20}\b', '[REDACTED_NAME]', x)
    # MRN-like tokens
    x = re.sub(r'\bMRN[:\s]*\d+\b', '[REDACTED_MRN]', x, flags=re.IGNORECASE)
    return x
