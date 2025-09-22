
#modules>audio_handler.py

import os
import tempfile
import requests
import numpy as np
import soundfile as sf
from moviepy.editor import VideoFileClip
from io import BytesIO
from pydub import AudioSegment

try:
    from fastapi import UploadFile
except ImportError:
    UploadFile = None  # fallback if FastAPI not installed


TMP_DIR = tempfile.gettempdir()


# ------------------------
# Helpers: Save & Download
# ------------------------
def save_uploaded_file(uploaded_file, suffix=""):
    """
    Save uploaded file or path into a temporary file and return its path.
    Supports:
      - Django/DRF InMemoryUploadedFile / TemporaryUploadedFile
      - FastAPI UploadFile
      - BytesIO
      - str (already a file path)
    """
    try:
        # Case 1: Already a path string
        if isinstance(uploaded_file, str) and os.path.exists(uploaded_file):
            return uploaded_file

        # Case 2: FastAPI UploadFile
        if UploadFile and isinstance(uploaded_file, UploadFile):
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TMP_DIR) as tmp_file:
                tmp_file.write(uploaded_file.file.read())
                return tmp_file.name

        # Case 3: Django/DRF InMemoryUploadedFile / TemporaryUploadedFile
        if hasattr(uploaded_file, "read"):
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TMP_DIR) as tmp_file:
                tmp_file.write(uploaded_file.read())
                return tmp_file.name

        # Case 4: BytesIO
        if isinstance(uploaded_file, BytesIO):
            uploaded_file.seek(0)
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TMP_DIR) as tmp_file:
                tmp_file.write(uploaded_file.read())
                return tmp_file.name

        raise RuntimeError(f"Unsupported input type for save_uploaded_file: {type(uploaded_file)}")

    except Exception as e:
        raise RuntimeError(f"Error saving uploaded file: {e}")


def download_file_from_url(url, suffix=""):
    """
    Download a file from URL into a temp file on disk.
    """
    try:
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TMP_DIR) as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            return tmp_file.name
    except Exception as e:
        raise RuntimeError(f"Error downloading file: {e}")


# ------------------------
# Audio Processing
# ------------------------
def load_audio_as_array(file_path, target_sr=16000):
    """
    Load an audio file into a numpy array + sample rate.
    Always resamples to target_sr and mono.
    """
    try:
        waveform, sample_rate = sf.read(file_path, dtype="float32")

        # Ensure mono
        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=1)

        # Resample if needed
        if sample_rate != target_sr:
            import librosa
            waveform = librosa.resample(waveform, orig_sr=sample_rate, target_sr=target_sr)
            sample_rate = target_sr

        return waveform, sample_rate
    except Exception as e:
        raise RuntimeError(f"Error loading audio: {e}")


def load_audio_from_file(uploaded_file):
    """
    Handle uploaded audio file (Django/DRF/FastAPI upload).
    Returns waveform numpy array + sample rate.
    """
    audio_path = None
    try:
        audio_path = save_uploaded_file(uploaded_file, suffix=".wav")
        return load_audio_as_array(audio_path)
    except Exception as e:
        raise RuntimeError(f"Error loading audio from file: {e}")
    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


def load_audio_from_url(url):
    """
    Handle audio from URL.
    Returns waveform numpy array + sample rate.
    """
    audio_path = None
    try:
        head = requests.head(url, allow_redirects=True, timeout=5)
        if "audio" not in head.headers.get("Content-Type", ""):
            raise ValueError("Provided URL is not an audio file")

        audio_path = download_file_from_url(url, suffix=".wav")
        return load_audio_as_array(audio_path)
    except Exception as e:
        raise RuntimeError(f"Error loading audio from URL: {e}")
    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)


# ------------------------
# Video Processing
# ------------------------
def extract_audio_from_video(uploaded_file_or_url, is_url=False):
    """
    Extract audio track from video file or URL.
    Returns waveform numpy array + sample rate.
    """
    video_path, audio_tmp_path = None, None
    try:
        if is_url:
            head = requests.head(uploaded_file_or_url, allow_redirects=True, timeout=5)
            if "video" not in head.headers.get("Content-Type", ""):
                raise ValueError("Provided URL is not a video file")
            video_path = download_file_from_url(uploaded_file_or_url, suffix=".mp4")
        else:
            video_path = save_uploaded_file(uploaded_file_or_url, suffix=".mp4")

        # Create temp audio file
        audio_tmp_path = video_path.replace(".mp4", "_audio.wav")

        # Extract with moviepy
        clip = VideoFileClip(video_path)
        if clip.audio is None:
            raise ValueError("No audio track found in video")
        clip.audio.write_audiofile(audio_tmp_path, codec="pcm_s16le", fps=16000, logger=None)
        clip.close()

        # Return numpy waveform
        return load_audio_as_array(audio_tmp_path)

    except Exception as e:
        raise RuntimeError(f"Error extracting audio from video: {e}")
    finally:
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
        if audio_tmp_path and os.path.exists(audio_tmp_path):
            os.remove(audio_tmp_path)


# ------------------------
# Extra Utilities for Controller
# ------------------------
def convert_to_wav(file_bytes):
    """
    Convert uploaded audio bytes into WAV format (BytesIO).
    """
    try:
        audio = AudioSegment.from_file(BytesIO(file_bytes))
        buf = BytesIO()
        audio.export(buf, format="wav")
        buf.seek(0)
        return buf
    except Exception as e:
        raise RuntimeError(f"Error converting to wav: {e}")


def resample_audio_to_16k(wav_bytes):
    """
    Ensure audio is 16kHz mono WAV (BytesIO).
    """
    try:
        audio = AudioSegment.from_file(wav_bytes, format="wav")
        audio = audio.set_frame_rate(16000).set_channels(1)

        buf = BytesIO()
        audio.export(buf, format="wav")
        buf.seek(0)
        return buf
    except Exception as e:
        raise RuntimeError(f"Error resampling audio: {e}")
