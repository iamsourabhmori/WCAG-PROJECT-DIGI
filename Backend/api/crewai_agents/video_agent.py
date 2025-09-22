
# backend/api/crewai_agents/video_agent.py

from io import BytesIO
from modules.video_handler import load_video_file, extract_audio_from_video
from modules.audio_handler import convert_to_wav, resample_audio_to_16k
from modules.huggingface_model import load_wav2vec2_model, transcribe_voice_command

class VideoAgent:
    """
    VideoAgent handles:
        1️⃣ Video file processing
        2️⃣ Extract audio from video
        3️⃣ Transcribe extracted audio
    """

    def __init__(self):
        self.processor, self.model = load_wav2vec2_model()

    def process_video(self, file=None, real_time_placeholder=None):
        """
        Process video file, extract audio, and transcribe.
        """
        if not file:
            return "❌ No video file provided."

        video_bytes = load_video_file(file)
        if not video_bytes:
            return "❌ Failed to load video file."

        # Extract audio from video
        audio_bytes = extract_audio_from_video(video_bytes)
        if not audio_bytes:
            return "❌ Failed to extract audio from video."

        # Convert audio to WAV and resample
        wav_bytes = convert_to_wav(audio_bytes)
        wav_bytes = resample_audio_to_16k(wav_bytes)
        if not wav_bytes:
            return "❌ Failed to process audio from video."

        # Transcribe audio using Wav2Vec2
        transcript = self._transcribe_audio(wav_bytes, real_time_placeholder)
        return transcript

    def _transcribe_audio(self, wav_bytes: BytesIO, placeholder=None):
        """
        Internal: transcribe WAV bytes using Wav2Vec2 model
        """
        import soundfile as sf
        import torch

        wav_bytes.seek(0)
        speech, rate = sf.read(wav_bytes)
        if len(speech.shape) > 1:
            speech = speech.mean(axis=1)

        inputs = self.processor(speech, sampling_rate=rate, return_tensors="pt", padding=True)
        with torch.no_grad():
            logits = self.model(**inputs).logits
        pred_ids = torch.argmax(logits, dim=-1)
        transcript = self.processor.batch_decode(pred_ids)[0]

        # Optional: display in Streamlit
        if placeholder:
            for word in transcript.split():
                from modules.utils import display_words_streamlit
                display_words_streamlit(word, placeholder)

        return transcript.strip()


# ✅ Module-level instance and function for direct import
_video_agent_instance = VideoAgent()

def process_video_file(file=None, real_time_placeholder=None):
    """
    Module-level wrapper for direct import.
    """
    return _video_agent_instance.process_video(file=file, real_time_placeholder=real_time_placeholder)
