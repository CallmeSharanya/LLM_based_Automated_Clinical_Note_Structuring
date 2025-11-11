import os
import google.generativeai as genai
import json

genai.configure(api_key=os.getenv("GOOGLE_API_KEY" ))

GEMINI_MODEL = "gemini-2.5-flash"

def structure_with_gemini(note_text:str):
    prompt = f"""
You are a clinical assistant. Convert the following note into structured JSON using this schema:

{{
  "SOAP": {{
     "Subjective": "<text>",
     "Objective": "<text>",
     "Assessment": "<text>",
     "Plan": "<text>"
  }}
}}

If any field is missing, leave it as an empty string.
Return JSON only (no explanations).

Note:
\"\"\"{note_text}\"\"\"
"""
    
    model=genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(prompt)
    text=response.text.strip()

    #extract json
    try:
        start = text.find('{')
        end = text.rfind('}') + 1
        json_str = text[start:end]
        data = json.loads(json_str)
        soap = data.get("SOAP", {})
        return {
            "SOAP":{
                "Subjective": soap.get("Subjective", ""),
                "Objective": soap.get("Objective", ""),
                "Assessment": soap.get("Assessment", ""),
                "Plan": soap.get("Plan", "")
            },
            "raw_model_output": text
        }
    except Exception as e:
        print("Error parsing JSON:", e)
        return {
            "SOAP":{
                "Subjective": "",
                "Objective": "",
                "Assessment": "",
                "Plan": ""
            },
            "raw_model_output": text,
            "parse_error": str(e)
        }
    
def embed_with_gemini(text:str):
    embed_model = "text-embedding-004"
    model = genai.embed_content(model=embed_model, content=text)
    return model["embedding"]  