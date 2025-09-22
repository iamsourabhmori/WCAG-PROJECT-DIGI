
# modules/video_handler.py

import os
import tempfile
import requests
from io import BytesIO
from moviepy.editor import VideoFileClip


# ------------------------
# Temp directory
# ------------------------
TMP_DIR = tempfile.gettempdir()


# ------------------------
# Video Handlers
# ------------------------
def load_video_file(uploaded_file):
    """
    Load uploaded video file into memory as BytesIO.
    """
    try:
        return BytesIO(uploaded_file.read())
    except Exception as e:
        raise ValueError(f"Error reading uploaded video file: {e}")


def validate_video_url(url: str) -> bool:
    """
    Validate that the URL is reachable and points to a video file.
    """
    try:
        head = requests.head(url, allow_redirects=True, timeout=5)
        return "video" in head.headers.get("Content-Type", "")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Invalid or unreachable video URL: {e}")


def download_video_from_url(url: str) -> BytesIO:
    """
    Download video from a validated URL into a BytesIO object.
    """
    if not validate_video_url(url):
        raise ValueError("Provided URL is not a video file")

    try:
        response = requests.get(url, stream=True, timeout=15)
        response.raise_for_status()
        return BytesIO(response.content)
    except Exception as e:
        raise RuntimeError(f"Failed to download video file: {e}")


def extract_audio_from_video(video_bytes: BytesIO, target_format="wav") -> BytesIO:
    """
    Extract audio from video and return as BytesIO in WAV format (mono, 16 kHz).
    """
    tmp_video_path, tmp_audio_path = None, None
    try:
        # Save video BytesIO to a temp file
        video_bytes.seek(0)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=TMP_DIR) as tmp_video:
            tmp_video.write(video_bytes.read())
            tmp_video_path = tmp_video.name

        # Open with MoviePy
        clip = VideoFileClip(tmp_video_path)
        if clip.audio is None:
            clip.close()
            os.remove(tmp_video_path)
            raise ValueError("No audio track found in this video")

        # Extract audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{target_format}", dir=TMP_DIR) as tmp_audio:
            clip.audio.write_audiofile(
                tmp_audio.name,
                codec="pcm_s16le",
                fps=16000,
                verbose=False,
                logger=None
            )
            tmp_audio_path = tmp_audio.name

        # Load audio into BytesIO
        wav_io = BytesIO()
        with open(tmp_audio_path, "rb") as f:
            wav_io.write(f.read())
        wav_io.seek(0)

        return wav_io

    except Exception as e:
        raise RuntimeError(f"Failed to extract audio from video: {e}")

    finally:
        # Cleanup
        if tmp_audio_path and os.path.exists(tmp_audio_path):
            os.remove(tmp_audio_path)
        if tmp_video_path and os.path.exists(tmp_video_path):
            os.remove(tmp_video_path)


def get_video_duration(video_bytes: BytesIO) -> float:
    """
    Returns video duration in seconds.
    """
    tmp_video_path = None
    try:
        video_bytes.seek(0)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=TMP_DIR) as tmp_video:
            tmp_video.write(video_bytes.read())
            tmp_video_path = tmp_video.name

        clip = VideoFileClip(tmp_video_path)
        duration = clip.duration
        clip.close()
        return duration

    except Exception as e:
        raise RuntimeError(f"Failed to calculate video duration: {e}")

    finally:
        if tmp_video_path and os.path.exists(tmp_video_path):
            os.remove(tmp_video_path)


def save_uploaded_video_file(uploaded_file):
    """
    Save uploaded video temporarily and return path.
    """
    try:
        suffix = os.path.splitext(uploaded_file.name)[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=TMP_DIR) as tmp_file:
            tmp_file.write(uploaded_file.read())  # ✅ fixed
            return tmp_file.name
    except Exception as e:
        raise RuntimeError(f"Error saving uploaded video file: {e}")
