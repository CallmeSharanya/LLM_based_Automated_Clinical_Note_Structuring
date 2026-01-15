# icd_mapper.py
import csv
from rapidfuzz import process, fuzz
from typing import List, Tuple

def load_icd_codes(path: str = "data/icd10.csv") -> List[Tuple[str,str]]:
    codes = []
    try:
        with open(path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                code = row.get('code') or row.get('Code') or row.get('ICD_CODE')
                desc = row.get('description') or row.get('Description') or row.get('ICD_DESC')
                if code and desc:
                    codes.append((code.strip(), desc.strip()))
    except FileNotFoundError:
        print("icd10.csv not found in data/. Please download and place it at data/icd10.csv")
    return codes

def match_icd(diagnosis_text: str, icd_codes: List[Tuple[str,str]], top_n=3):
    """
    Return top_n fuzzy ICD matches as list of dicts.
    """
    if not icd_codes or not diagnosis_text.strip():
        return []
    choices = [f"{c} - {d}" for c,d in icd_codes]
    results = process.extract(diagnosis_text, choices, scorer=fuzz.WRatio, limit=top_n)
    out = []
    for match, score, idx in results:
        code, _, desc = match.partition(' - ')
        out.append({"code": code, "description": desc, "score": float(score)})
    return out
