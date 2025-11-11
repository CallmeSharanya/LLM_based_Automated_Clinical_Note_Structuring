from crewai import Agent 
from agents.gemini_llm import GeminiLLM
import os

os.environ["CREWAI_DEFAULT_LLM_PROVIDER"] = "none"
os.environ.pop("OPENAI_API_KEY", None)

gemini_llm = GeminiLLM()

structuring_agent = Agent(
    role = "EHR Structuring Agent",
    goal = "Convert unstructured notes to structured SOAP + ICD format",
    backstory = "A clinical data assistant that ensures medical notes follow SOAP and ICD-10 standards, Trained on medical notes and documentation practices.",
    llm = gemini_llm,
)
