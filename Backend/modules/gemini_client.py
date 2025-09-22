# backend/modules/gemini_client.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set in environment variables.")

genai.configure(api_key=GEMINI_API_KEY)

class GeminiClientWrapper:
    """Wrapper for Gemini API"""
    def summarize_text(self, text: str) -> str:
        if not text.strip():
            return "No content available for summarization."
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                f"Summarize this document in clear, simple language:\n\n{text}"
            )
            return response.text if response and response.text else "No summary generated."
        except Exception as e:
            return f"Error during summarization: {str(e)}"

# create a singleton instance
gemini_client_instance = GeminiClientWrapper()

# for direct function import if needed
def summarize_text(text: str) -> str:
    return gemini_client_instance.summarize_text(text)
