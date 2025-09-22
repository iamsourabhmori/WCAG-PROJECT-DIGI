
# backend/api/crewai_agents/audio_agent.py

import streamlit as st
from io import BytesIO
from modules.huggingface_model import load_wav2vec2_model, transcribe_voice_command
from modules.audio_handler import (
    load_audio_from_file,
    load_audio_from_url,
    convert_to_wav,
    resample_audio_to_16k,
)
from modules.utils import display_words_streamlit

class AudioAgent:
    """
    AudioAgent handles:
        1️⃣ Audio file transcription
        2️⃣ Audio URL transcription
        3️⃣ Optional real-time display (for manual approach)
        4️⃣ Voice command transcription (via Wav2Vec2)
    """

    def __init__(self):
        self.processor, self.model = load_wav2vec2_model()

    def process_audio(self, file=None, url=None, real_time_placeholder=None):
        """
        Process an audio input (file or URL) and return transcription.
        Args:
            file: Uploaded file (from DRF request or Streamlit)
            url: Optional audio URL
            real_time_placeholder: Streamlit placeholder for live display
        Returns:
            transcript (str)
        """
        audio_bytes = None

        # 1️⃣ Load file or download from URL
        if file:
            audio_bytes = load_audio_from_file(file)
        elif url:
            audio_bytes = load_audio_from_url(url)

        if not audio_bytes:
            return "❌ No valid audio input found."

        # 2️⃣ Convert to WAV and resample to 16 kHz
        wav_bytes = convert_to_wav(audio_bytes)
        wav_bytes = resample_audio_to_16k(wav_bytes)

        if not wav_bytes:
            return "❌ Failed to process audio file."

        # 3️⃣ Transcribe using Wav2Vec2
        transcript = self._transcribe_wav(wav_bytes, real_time_placeholder)
        return transcript

    def _transcribe_wav(self, wav_bytes: BytesIO, placeholder=None) -> str:
        """
        Internal method: transcribe WAV bytes using Wav2Vec2 model
        """
        import soundfile as sf
        import torch

        wav_bytes.seek(0)
        speech, rate = sf.read(wav_bytes)
        if len(speech.shape) > 1:
            speech = speech.mean(axis=1)  # Convert to mono

        inputs = self.processor(speech, sampling_rate=rate, return_tensors="pt", padding=True)
        with torch.no_grad():
            logits = self.model(**inputs).logits
        pred_ids = torch.argmax(logits, dim=-1)
        transcript = self.processor.batch_decode(pred_ids)[0]

        # Optional: real-time display in Streamlit
        if placeholder:
            for word in transcript.split():
                display_words_streamlit(word, placeholder)

        return transcript.strip()

    def process_voice_command(self, wav_bytes: BytesIO) -> str:
        """
        Transcribe a short voice command using Wav2Vec2.
        """
        return transcribe_voice_command(wav_bytes)


# ✅ Module-level function for direct import
_audio_agent_instance = AudioAgent()

def process_audio_file(file=None, url=None, real_time_placeholder=None):
    """
    Module-level wrapper function so other modules can import directly.
    """
    return _audio_agent_instance.process_audio(file=file, url=url, real_time_placeholder=real_time_placeholder)

def process_voice_command_file(wav_bytes: BytesIO):
    """
    Module-level wrapper for voice command transcription.
    """
    return _audio_agent_instance.process_voice_command(wav_bytes)






