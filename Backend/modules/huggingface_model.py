# modules/huggingface_model.py

from functools import lru_cache
from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
from transformers import BlipProcessor, BlipForConditionalGeneration
import torch


# ------------------------
# Common Wav2Vec2 model loader for Audio, Video, and Voice Commands
# ------------------------
@lru_cache(maxsize=1)
def load_wav2vec2_model():
    """
    Load and cache the Wav2Vec2 model and processor.
    This model is used for:
        1️⃣ Audio transcription
        2️⃣ Video transcription (after extracting audio from video)
        3️⃣ Voice command transcription
    Returns:
        processor: Wav2Vec2Processor
        model: Wav2Vec2ForCTC
    """
    processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
    model = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h")
    return processor, model


def transcribe_voice_command(wav_bytes: bytes) -> str:
    """
    Transcribe a short WAV audio command using Wav2Vec2.
    Input:
        wav_bytes: bytes or BytesIO of recorded voice command (16 kHz WAV)
    Returns:
        transcript: str
    """
    import soundfile as sf
    from io import BytesIO

    processor, model = load_wav2vec2_model()

    # Read audio
    if isinstance(wav_bytes, bytes):
        wav_bytes = BytesIO(wav_bytes)
    wav_bytes.seek(0)
    speech, rate = sf.read(wav_bytes)
    if len(speech.shape) > 1:
        speech = speech.mean(axis=1)  # Convert stereo → mono

    # Process
    inputs = processor(speech, sampling_rate=rate, return_tensors="pt", padding=True)
    with torch.no_grad():
        logits = model(**inputs).logits
    pred_ids = torch.argmax(logits, dim=-1)
    transcript = processor.batch_decode(pred_ids)[0]

    return transcript.strip()


# ------------------------
# BLIP model loader for Image Captioning
# ------------------------
@lru_cache(maxsize=1)
def load_image_caption_model():
    """
    Load and cache the BLIP model and processor for image captioning.
    Returns:
        processor: BlipProcessor
        model: BlipForConditionalGeneration
    """
    processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
    return processor, model


# ------------------------
# Usage Notes
# ------------------------
# Audio & video transcription: use load_wav2vec2_model()
# Voice command transcription: use transcribe_voice_command()
# Image captioning: use load_image_caption_model()
