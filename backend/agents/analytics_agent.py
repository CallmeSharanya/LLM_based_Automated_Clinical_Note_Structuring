from crewai import Agent
from supabase import create_client
import os
from dotenv import load_dotenv
import pandas as pd

from agents.gemini_llm import GeminiLLM

import os

os.environ["CREWAI_DEFAULT_LLM_PROVIDER"] = "none"
os.environ.pop("OPENAI_API_KEY", None)

gemini_llm = GeminiLLM()

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

analytics_agent = Agent(
    role="Clinical Analytics Agent",
    goal="Analyze structured notes and identify trends or statistics",
    backstory="A data-driven assistant that produces summaries from stored EHR data.",
    llm=gemini_llm,
)

def get_icd_statistics():
    result = supabase.table("clinical_notes").select("icd_json").execute()
    if not result.data:
        return "No notes found."
    df = pd.DataFrame(result.data)
    codes = []
    for row in df["icd_json"]:
        if row:
            codes.extend([c["code"] for c in row if "code" in c])
    return pd.Series(codes).value_counts().head(5).to_dict()
