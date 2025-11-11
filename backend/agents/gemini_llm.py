import google.generativeai as genai
import os

class GeminiLLM:
    def __init__(self, model_name="gemini-1.5-flash"):
        self.model = model_name 
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment.")
        genai.configure(api_key=api_key)
        self.client = genai.GenerativeModel(model_name=self.model)

    def run(self, prompt: str) -> str:
        """Runs a single prompt through Gemini and returns plain text."""
        try:
            response = self.client.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error calling Gemini: {e}"

    def __call__(self, prompt: str) -> str:
        """CrewAI sometimes calls llm(prompt) directly."""
        return self.run(prompt)
