"""
LLM Wrapper for CrewAI Agents
Uses Groq as primary LLM to avoid Gemini quota issues.
Falls back to Gemini if Groq is unavailable.
"""

import os

# Try to import Groq (primary)
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    print("⚠️ Groq not installed for CrewAI agents.")

# Try to import Gemini (fallback)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Gemini not installed for CrewAI agents.")


class GeminiLLM:
    """
    LLM wrapper that uses Groq as primary and Gemini as fallback.
    Named GeminiLLM for backwards compatibility with existing code.
    """
    
    def __init__(self, model_name="llama-3.3-70b-versatile"):
        self.groq_model = model_name
        self.use_groq = GROQ_AVAILABLE and os.getenv("GROQ_API_KEY")
        
        if self.use_groq:
            self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Gemini as fallback
        self.gemini_client = None
        if GEMINI_AVAILABLE:
            api_key = os.getenv("GOOGLE_API_KEY")
            if api_key:
                try:
                    genai.configure(api_key=api_key)
                    self.gemini_client = genai.GenerativeModel(model_name="gemini-2.0-flash")
                except Exception as e:
                    print(f"⚠️ Could not initialize Gemini: {e}")

    def run(self, prompt: str) -> str:
        """Runs a single prompt through Groq (primary) or Gemini (fallback)."""
        # Try Groq first
        if self.use_groq:
            try:
                response = self.groq_client.chat.completions.create(
                    model=self.groq_model,
                    messages=[
                        {"role": "system", "content": "You are a helpful clinical documentation assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=2048
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                print(f"Groq error: {e}")
        
        # Fallback to Gemini
        if self.gemini_client:
            try:
                response = self.gemini_client.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                return f"Error calling LLM: {e}"
        
        return "Error: No LLM available"

    def __call__(self, prompt: str) -> str:
        """CrewAI sometimes calls llm(prompt) directly."""
        return self.run(prompt)
