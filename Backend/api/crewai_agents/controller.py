
# backend/api/crewai_agents/controller.py
import os
import tempfile
import streamlit as st
import torch
import numpy as np
import soundfile as sf
from io import BytesIO
from pydub import AudioSegment
import logging
from modules.gemini_client import gemini_client_instance as gemini_client


# Modules
from modules.audio_handler import (
    load_audio_from_url,
    extract_audio_from_video,
    # note: load_audio_from_file exists in audio_handler but we don't import it here
)
from modules.video_handler import download_video_from_url
from modules.image_handler import load_image
from api.crewai_agents.doc_agent import DocumentAgent
from modules.huggingface_model import load_wav2vec2_model, load_image_caption_model, transcribe_voice_command

# Optional: librosa for resampling (audio_handler uses it too). If not installed, pydub fallback is used.
try:
    import librosa
    HAVE_LIBROSA = True
except Exception:
    HAVE_LIBROSA = False

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# ------------------------
# Helpers
# ------------------------
def is_waveform_tuple(obj):
    """Return True if obj looks like (waveform ndarray, sample_rate int)."""
    return (
        isinstance(obj, (list, tuple))
        and len(obj) == 2
        and isinstance(obj[0], (np.ndarray, list))
        and isinstance(obj[1], (int, float))
    )


def bytesio_from_uploaded(uploaded_file):
    """
    Convert a Django UploadedFile (InMemoryUploadedFile or TemporaryUploadedFile)
    to BytesIO and return it.
    """
    b = BytesIO(uploaded_file.read())
    b.seek(0)
    return b


def ensure_waveform(obj, target_sr=16000):
    """
    Normalize different input types into: (np.ndarray waveform (float32), sr:int).
    Supported inputs:
      - (waveform, sr) tuple -> pass-through (resample if needed)
      - BytesIO (wav/mp3/...): read via soundfile
      - raw bytes -> BytesIO -> read
      - string path -> sf.read(path)
    Returns: (waveform np.float32, sr int)
    Raises RuntimeError on unsupported/failed inputs.
    """
    try:
        # Case 1: tuple returned by helpers (waveform, sr)
        if is_waveform_tuple(obj):
            waveform = np.asarray(obj[0], dtype="float32")
            sr = int(obj[1])
        # Case 2: BytesIO or file-like
        elif isinstance(obj, BytesIO):
            obj.seek(0)
            waveform, sr = sf.read(obj, dtype="float32")
        # Case 3: raw bytes
        elif isinstance(obj, (bytes, bytearray)):
            bio = BytesIO(obj)
            waveform, sr = sf.read(bio, dtype="float32")
        # Case 4: file path (str / os.PathLike)
        elif isinstance(obj, str) and os.path.exists(obj):
            waveform, sr = sf.read(obj, dtype="float32")
        else:
            raise RuntimeError(f"Unsupported audio input type: {type(obj)}")

        # Ensure waveform is 1-D (mono)
        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=1).astype("float32")

        # Resample if needed
        if sr != target_sr:
            if HAVE_LIBROSA:
                waveform = librosa.resample(waveform, orig_sr=sr, target_sr=target_sr)
                sr = target_sr
            else:
                # Fallback: use pydub to resample (less precise but avoids missing dependency)
                # Re-encode into BytesIO and read back
                with BytesIO() as tmp_b:
                    # write current waveform to temp WAV first
                    sf.write(tmp_b, waveform, sr, format="WAV")
                    tmp_b.seek(0)
                    audio_seg = AudioSegment.from_file(tmp_b, format="wav")
                    audio_seg = audio_seg.set_frame_rate(target_sr).set_channels(1)
                    out_b = BytesIO()
                    audio_seg.export(out_b, format="wav")
                    out_b.seek(0)
                    waveform, sr = sf.read(out_b, dtype="float32")
                    if waveform.ndim > 1:
                        waveform = np.mean(waveform, axis=1).astype("float32")

        # Ensure dtype float32
        waveform = waveform.astype("float32")
        return waveform, int(sr)

    except Exception as e:
        raise RuntimeError(f"Failed to load audio waveform: {e}")


def read_uploadedfile_to_temp_path(uploaded_file, suffix=""):
    """
    Save uploaded file to a temp path and return the path (caller must not assume deletion).
    """
    tmp = None
    try:
        fd, tmp = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        with open(tmp, "wb") as f:
            f.write(uploaded_file.read())
        return tmp
    except Exception as e:
        if tmp and os.path.exists(tmp):
            os.remove(tmp)
        raise RuntimeError(f"Failed to save uploaded file to temp path: {e}")


# ------------------------
# MultiModalController
# ------------------------
class MultiModalController:
    """
    Handles Audio, Video, Image, and Document processing entirely in-memory.
    """

    def __init__(self):
        # Load models (cached by huggingface_model)
        self.processor, self.asr_model = load_wav2vec2_model()
        self.doc_agent = DocumentAgent()
        self.image_processor, self.image_model = load_image_caption_model()

    # ------------------------
    # Audio Handling
    # ------------------------
    def process_audio(self, uploaded_file=None, url=None):
        """
        Accepts:
          - uploaded_file: Django UploadedFile object (file-like)
          - url: audio file url
        Returns transcription string or {"error": ...}
        """
        tmp_paths_to_cleanup = []
        try:
            source = None

            if uploaded_file is not None:
                # UploadedFile: prefer BytesIO (soundfile supports file-like)
                if hasattr(uploaded_file, "read"):
                    source = BytesIO(uploaded_file.read())
                else:
                    # fallback: save to temp file path
                    tmp_path = read_uploadedfile_to_temp_path(uploaded_file, suffix=".tmp")
                    tmp_paths_to_cleanup.append(tmp_path)
                    source = tmp_path
            elif url:
                # audio handler's load_audio_from_url returns (waveform, sr) in your audio_handler
                try:
                    src = load_audio_from_url(url)
                    # load_audio_from_url returns (waveform, sr) tuple per updated audio_handler
                    if is_waveform_tuple(src):
                        waveform, sr = ensure_waveform(src)
                        # proceed to transcription using waveform directly
                        inputs = self.processor(waveform, sampling_rate=sr, return_tensors="pt", padding=True)
                        with torch.no_grad():
                            logits = self.asr_model(**inputs).logits
                        pred_ids = torch.argmax(logits, dim=-1)
                        transcript = self.processor.batch_decode(pred_ids)[0]
                        return transcript.strip()
                    else:
                        # if it returns BytesIO / path, use ensure_waveform below
                        source = src
                except Exception as e:
                    # fallback: treat url as downloadable file
                    tmp_path = None
                    try:
                        tmp_path = download_video_from_url(url)  # we can reuse video downloader for generic download
                        tmp_paths_to_cleanup.append(tmp_path)
                        source = tmp_path
                    except Exception:
                        raise RuntimeError(f"Failed to load audio from URL: {e}")

            if source is None:
                raise RuntimeError("No audio source provided")

            # Normalize to (waveform, sr)
            waveform, sr = ensure_waveform(source, target_sr=16000)

            # Use processor & model
            inputs = self.processor(waveform, sampling_rate=16000, return_tensors="pt", padding=True)
            with torch.no_grad():
                logits = self.asr_model(**inputs).logits
            pred_ids = torch.argmax(logits, dim=-1)
            transcript = self.processor.batch_decode(pred_ids)[0]
            return transcript.strip()

        except Exception as e:
            logger.exception("Audio processing exception")
            return {"error": f"Audio processing failed: {str(e)}"}

        finally:
            # cleanup
            for p in tmp_paths_to_cleanup:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception:
                    pass

    # ------------------------
    # Video Handling
    # ------------------------
    def process_video(self, uploaded_file=None, url=None):
        """
        Accepts:
          - uploaded_file: Django UploadedFile object (file-like)
          - url: video url
        Returns transcription string or {"error": ...}
        """
        tmp_paths_to_cleanup = []
        try:
            source = None

            if uploaded_file is not None:
                if hasattr(uploaded_file, "read"):
                    # Save uploaded video to temp path because moviepy expects a filename
                    tmp_path = read_uploadedfile_to_temp_path(uploaded_file, suffix=".mp4")
                    tmp_paths_to_cleanup.append(tmp_path)
                    source = tmp_path
                else:
                    source = uploaded_file  # maybe a file path
            elif url:
                # download the video to temp path
                tmp_path = download_video_from_url(url)
                tmp_paths_to_cleanup.append(tmp_path)
                source = tmp_path

            if source is None:
                raise RuntimeError("No video source provided")

            # extract_audio_from_video in your audio_handler returns (waveform, sr) for the temp file path
            # Accept both (waveform, sr) or BytesIO or path depending on your helper
            extracted = extract_audio_from_video(source, is_url=False if not url else True)

            # If the helper returned waveform tuple, use it directly
            if is_waveform_tuple(extracted):
                waveform, sr = ensure_waveform(extracted, target_sr=16000)
            else:
                # otherwise normalize whatever it returned
                waveform, sr = ensure_waveform(extracted, target_sr=16000)

            # Transcribe
            inputs = self.processor(waveform, sampling_rate=16000, return_tensors="pt", padding=True)
            with torch.no_grad():
                logits = self.asr_model(**inputs).logits
            pred_ids = torch.argmax(logits, dim=-1)
            transcript = self.processor.batch_decode(pred_ids)[0]
            return transcript.strip()

        except Exception as e:
            logger.exception("Video processing exception")
            return {"error": f"Video processing failed: {str(e)}"}

        finally:
            # cleanup any temp files produced
            for p in tmp_paths_to_cleanup:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception:
                    pass

    # ------------------------
    # Image Handling
    # ------------------------
    def process_image(self, uploaded_file=None, url=None):
        try:
            if uploaded_file:
                # For images, pass file-like or BytesIO to load_image which expects file/BytesIO or URL
                if hasattr(uploaded_file, "read"):
                    image_pil = load_image(BytesIO(uploaded_file.read()))
                else:
                    image_pil = load_image(uploaded_file)
            elif url:
                image_pil = load_image(url)
            else:
                return {"error": "No image provided"}

            inputs = self.image_processor(images=image_pil, return_tensors="pt")
            outputs = self.image_model.generate(**inputs, max_new_tokens=50)
            caption = self.image_processor.decode(outputs[0], skip_special_tokens=True)
            return caption

        except Exception as e:
            logger.exception("Image processing exception")
            return {"error": f"Image processing failed: {str(e)}"}



    # ------------------------
    # Document Handling
    # ------------------------
    def process_document(self, uploaded_file=None, speak=False):
        """
        Process a document (PDF, DOCX, TXT, etc.), extract text, summarize it using Gemini,
        and optionally return it for TTS playback if speak=True.
        """
        if uploaded_file is None:
            return {"error": "No document uploaded"}

        tmp_path = None
        try:
            # Save uploaded_file to a temporary path
            if hasattr(uploaded_file, "read"):  # Django InMemoryUploadedFile
                ext = os.path.splitext(uploaded_file.name)[-1] if hasattr(uploaded_file, "name") else ".tmp"
                fd, tmp_path = tempfile.mkstemp(suffix=ext)
                os.close(fd)
                with open(tmp_path, "wb") as f:
                    f.write(uploaded_file.read())
            else:
                tmp_path = str(uploaded_file)

            # Run DocumentAgent
            result = self.doc_agent.process_document(file_path=tmp_path)

            # Handle both string and dict returns
            if isinstance(result, dict):
                if "error" in result:
                    return result
                extracted_text = result.get("content", "")
            else:
                extracted_text = str(result)

            if not extracted_text.strip():
                return {"error": "No text extracted from document."}

            # Summarize with Gemini
            summary = gemini_client.summarize_text(extracted_text)

            if speak:
                # Optional: integrate TTS here
                pass

            return {
                "text": extracted_text,
                "summary": summary,
            }

        except Exception as e:
            logger.exception("Document processing exception")
            return {"error": f"Document processing failed: {str(e)}"}

        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass



    # ------------------------
    # Voice Command Handling
    # ------------------------
    def process_voice_command(self, audio_bytes: BytesIO):
        return transcribe_voice_command(audio_bytes)

    # ------------------------
    # Unified Pipeline
    # ------------------------
    def run_pipeline(self, input_type, file=None, url=None):
        if input_type == "audio":
            return self.process_audio(uploaded_file=file, url=url)
        elif input_type == "video":
            return self.process_video(uploaded_file=file, url=url)
        elif input_type == "image":
            return self.process_image(uploaded_file=file, url=url)
        elif input_type == "document":
            return self.process_document(uploaded_file=file)
        else:
            return {"error": f"Unsupported input_type: {input_type}"}

    # ------------------------
    # Streamlit word display helper
    # ------------------------
    @staticmethod
    def display_words_streamlit(words, delay=0.1, placeholder=None):
        import time
        if placeholder is None:
            placeholder = st.empty()
        for word in words.split():
            placeholder.text(word)
            time.sleep(delay)


# ------------------------
# Alias for views.py
# ------------------------
AgentController = MultiModalController
