
# modules/utils.py

import os
import mimetypes
from io import BytesIO
from PIL import Image
import tempfile
import logging
import streamlit as st
import time

# Setup basic logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# -----------------------------
# Audio & Video Transcript Helpers
# -----------------------------
def save_transcript(text, original_file: str = None, output_dir: str = None) -> str:
    """
    Save transcript text to a local file.
    Args:
        text (str): transcript text
        original_file (str): optional, original filename to derive transcript name
        output_dir (str): optional, directory to save transcript
    Returns:
        str: absolute path of saved transcript
    """
    if original_file:
        base_name = os.path.splitext(os.path.basename(original_file))[0]
        filename = f"{base_name}_transcript.txt"
    else:
        filename = "transcript.txt"

    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.join(output_dir, filename)

    with open(filename, "w", encoding="utf-8") as f:
        f.write(text)

    return os.path.abspath(filename)


# -----------------------------
# Video Helpers
# -----------------------------
def get_video_info(file_bytes: BytesIO):
    """
    Extract basic metadata from a video file.
    Returns: dict { duration_sec, fps, mime_type } or error dict
    """
    tmp_video_path = None
    try:
        import cv2

        file_bytes.seek(0)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
            tmp_file.write(file_bytes.read())
            tmp_video_path = tmp_file.name

        cap = cv2.VideoCapture(tmp_video_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video for metadata extraction")

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        duration = frame_count / fps if fps > 0 else 0

        cap.release()
        mime_type, _ = mimetypes.guess_type(tmp_video_path)

        return {
            "duration_sec": round(duration, 2),
            "fps": round(fps, 2),
            "mime_type": mime_type or "video/mp4"
        }

    except Exception as e:
        logger.error(f"Failed to read video info: {e}")
        return {"error": f"Failed to read video info: {str(e)}"}

    finally:
        if tmp_video_path and os.path.exists(tmp_video_path):
            os.remove(tmp_video_path)


# -----------------------------
# Image Helpers
# -----------------------------
def load_image_from_bytes(image_bytes: BytesIO) -> Image.Image:
    """
    Load a PIL image from bytes.
    """
    if isinstance(image_bytes, (bytes, bytearray)):
        image_bytes = BytesIO(image_bytes)
    try:
        return Image.open(image_bytes).convert("RGB")
    except Exception as e:
        logger.error(f"Failed to load image: {e}")
        raise ValueError(f"Failed to load image: {e}")


def save_caption(caption_text: str, original_file: str = None, output_dir: str = None) -> str:
    """
    Save generated caption to a text file.
    """
    if original_file:
        base_name = os.path.splitext(os.path.basename(original_file))[0]
        filename = f"{base_name}_caption.txt"
    else:
        filename = "caption.txt"

    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.join(output_dir, filename)

    with open(filename, "w", encoding="utf-8") as f:
        f.write(caption_text)

    return os.path.abspath(filename)


def display_image_with_caption(image_bytes: BytesIO, caption: str, width: int = 400):
    """
    Display an image in Streamlit with a caption.
    Args:
        image_bytes: BytesIO object of the image
        caption: Text caption
        width: Display width
    """
    try:
        image_bytes.seek(0)
        img = Image.open(image_bytes).convert("RGB")
        st.image(img, caption=caption, use_column_width=False, width=width)
    except Exception as e:
        st.error(f"Failed to display image: {e}")


# -----------------------------
# Streamlit Helpers
# -----------------------------
def display_words_streamlit(words, delay=0.1, placeholder=None):
    """
    Display words one by one in a Streamlit placeholder.
    """
    if placeholder is None:
        placeholder = st.empty()
    for word in words.split():
        placeholder.text(word)
        time.sleep(delay)


def display_transcript_streamlit(transcript: str, placeholder=None):
    """
    Display full transcript in Streamlit placeholder with line breaks.
    """
    if placeholder is None:
        placeholder = st.empty()
    placeholder.text_area("Transcript", value=transcript, height=200)


def display_video_streamlit(video_bytes: BytesIO, caption: str = None, width: int = 400):
    """
    Display video in Streamlit using bytes.
    """
    try:
        video_bytes.seek(0)
        st.video(video_bytes.read(), format="video/mp4", start_time=0)
        if caption:
            st.caption(caption)
    except Exception as e:
        st.error(f"Failed to display video: {e}")



