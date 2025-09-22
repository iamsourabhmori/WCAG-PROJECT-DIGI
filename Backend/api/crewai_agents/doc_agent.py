
# backend/api/crewai_agents/doc_agent.py

from io import BytesIO
import tempfile
import os
import pyttsx3
from gtts import gTTS
import streamlit as st

from modules.utils import display_words_streamlit
from modules.document_handler import extract_text_lines
from modules.gemini_client import summarize_text


class DocumentAgent:
    """
    DocumentAgent for extracting text from uploaded files, summarizing, and speaking.
    """

    def __init__(self, tts_engine="pyttsx3", llm_client=None):
        self.tts_engine_type = tts_engine
        self.llm_client = llm_client

        if tts_engine == "pyttsx3":
            self.engine = pyttsx3.init()
        else:
            self.engine = None

    def extract_text(self, file_path: str) -> str:
        """
        Extract text lines from a file.
        """
        try:
            lines = extract_text_lines(file_path)
            return "\n".join(lines)
        except Exception as e:
            return f"Error extracting text: {str(e)}"

    def display_document(self, uploaded_file, display_placeholder=None):
        """
        Display document content line by line in Streamlit.
        """
        ext = uploaded_file.name.split(".")[-1].lower()
        temp_path = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}").name

        with open(temp_path, "wb") as f:
            f.write(uploaded_file.read())

        lines = extract_text_lines(temp_path)

        for line in lines:
            display_words_streamlit(line, placeholder=display_placeholder)

        return "\n".join(lines)

    def summarize_document(self, text: str) -> str:
        """
        Summarize the document using Gemini.
        """
        return summarize_text(text)

    def speak_text(self, text: str):
        """
        Speak text aloud using TTS.
        """
        try:
            if self.tts_engine_type == "pyttsx3" and self.engine:
                self.engine.say(text)
                self.engine.runAndWait()
            else:
                tts = gTTS(text=text, lang="en")
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_audio:
                    tts.save(tmp_audio.name)
                    os.system(f"mpg123 {tmp_audio.name}")
                    os.remove(tmp_audio.name)
        except Exception as e:
            st.warning(f"⚠️ TTS failed: {str(e)}")

    def process_document(self, file_path: str) -> dict:
        """
        Extract text and summarize. Returns structured result.
        """
        try:
            text = self.extract_text(file_path)
            if not text or text.startswith("Error"):
                return {"error": f"Document processing failed: {text}"}

            summary = self.summarize_document(text)

            return {
                "content": text,
                "summary": summary
            }

        except Exception as e:
            return {"error": f"Document processing failed: {str(e)}"}


# -----------------------------
# Wrapper for imports
# -----------------------------
def process_document_file(file_path: str, display_placeholder=None):
    """
    This is required so voice_controller.py can import and use it directly.
    """
    agent = DocumentAgent()
    text = agent.extract_text(file_path)

    if display_placeholder:
        display_words_streamlit(text, placeholder=display_placeholder)

    summary = agent.summarize_document(text)
    return {"content": text, "summary": summary}
