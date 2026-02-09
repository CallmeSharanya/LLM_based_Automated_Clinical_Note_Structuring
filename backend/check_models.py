import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ GOOGLE_API_KEY not found in .env!")
    exit(1)

print(f"✅ Found API Key: {api_key[:5]}...{api_key[-4:]}")

try:
    genai.configure(api_key=api_key)
    
    print("\n🔍 Listing available models for your API Key...")
    models = genai.list_models()
    
    found_any = False
    print(f"{'Name':<30} | {'Supported Methods'}")
    print("-" * 60)
    
    for m in models:
        print(f"{m.name:<30} | {m.supported_generation_methods}")
        found_any = True
        
    if not found_any:
        print("⚠️ No models found! Your API key might not have access to Gemini API.")
        
except Exception as e:
    print(f"\n❌ Error listing models: {e}")

