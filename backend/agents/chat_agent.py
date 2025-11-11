from crewai import Agent
from db_utils import fetch_similar_notes
from llm_structurer import embed_with_gemini
import google.generativeai as genai

from agents.gemini_llm import GeminiLLM
import os

os.environ["CREWAI_DEFAULT_LLM_PROVIDER"] = "none"
os.environ.pop("OPENAI_API_KEY", None)

gemini_llm = GeminiLLM()

chat_agent = Agent(
    role="Clinical Chat Agent",
    goal="Answer clinician queries using similar historical clinical notes.",
    backstory="A clinical assistant that helps clinicians by retrieving and summarizing relevant clinical notes based on their queries and provides context-aware medical responses using EHR embeddings.",
    llm=gemini_llm,
)