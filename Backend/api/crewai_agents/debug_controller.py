# # backend/api/crewai_agents/debug_controller.py

# from io import BytesIO
# from pydub import AudioSegment
# import torch
# import streamlit as st
# from modules.audio_handler import load_audio_from_url, resample_audio_to_16k, extract_audio_from_video
# from modules.video_handler import download_video_from_url
# from modules.image_handler import load_image
# from api.crewai_agents.doc_agent import DocumentAgent
# from modules.huggingface_model import load_wav2vec2_model, load_image_caption_model, transcribe_voice_command


# class DebugMultiModalController:
#     """
#     Debug version to trace 'str' vs BytesIO issues for audio/video.
#     """

#     def __init__(self):
#         self.processor, self.asr_model = load_wav2vec2_model()
#         self.doc_agent = DocumentAgent()
#         self.image_processor, self.image_model = load_image_caption_model()

#     @staticmethod
#     def ensure_bytesio(file_or_bytes):
#         print(f"[DEBUG] ensure_bytesio received type: {type(file_or_bytes)}")
#         if hasattr(file_or_bytes, "read"):
#             print("[DEBUG] Detected file-like object")
#             return BytesIO(file_or_bytes.read())
#         elif isinstance(file_or_bytes, (bytes, bytearray)):
#             print("[DEBUG] Detected raw bytes")
#             return BytesIO(file_or_bytes)
#         elif isinstance(file_or_bytes, str):
#             print("[DEBUG] Detected string input")
#             # Possibly a path: convert to BytesIO
#             with open(file_or_bytes, "rb") as f:
#                 return BytesIO(f.read())
#         else:
#             raise ValueError(f"Unsupported input type: {type(file_or_bytes)}")

#     # ------------------------
#     # Audio
#     # ------------------------
#     def process_audio(self, uploaded_file=None, url=None):
#         try:
#             print(f"[DEBUG] process_audio called. uploaded_file={type(uploaded_file)}, url={url}")
#             if uploaded_file:
#                 audio_bytes = self.ensure_bytesio(uploaded_file)
#             elif url:
#                 audio_bytes = load_audio_from_url(url)
#                 print(f"[DEBUG] audio_bytes from URL type: {type(audio_bytes)}")
#             else:
#                 return {"error": "No audio provided"}

#             audio_segment = AudioSegment.from_file(audio_bytes)
#             print("[DEBUG] AudioSegment loaded successfully")

#             wav_io = BytesIO()
#             audio_segment.export(wav_io, format="wav")
#             wav_io.seek(0)

#             wav_resampled = resample_audio_to_16k(wav_io)
#             wav_bytes = wav_resampled.read()
#             print(f"[DEBUG] wav_bytes length: {len(wav_bytes)}")

#             inputs = self.processor(wav_bytes, sampling_rate=16000, return_tensors="pt", padding=True)
#             with torch.no_grad():
#                 logits = self.asr_model(**inputs).logits
#             pred_ids = torch.argmax(logits, dim=-1)
#             transcript = self.processor.batch_decode(pred_ids)[0]
#             print("[DEBUG] Transcript generated")
#             return transcript.strip()

#         except Exception as e:
#             print(f"[ERROR] Audio processing exception: {str(e)}")
#             return {"error": f"Audio processing failed: {str(e)}"}

#     # ------------------------
#     # Video
#     # ------------------------
#     def process_video(self, uploaded_file=None, url=None):
#         try:
#             print(f"[DEBUG] process_video called. uploaded_file={type(uploaded_file)}, url={url}")
#             if uploaded_file:
#                 video_bytes = self.ensure_bytesio(uploaded_file)
#             elif url:
#                 video_bytes = download_video_from_url(url)
#                 print(f"[DEBUG] video_bytes from URL type: {type(video_bytes)}")
#             else:
#                 return {"error": "No video provided"}

#             audio_bytes = extract_audio_from_video(video_bytes)
#             print(f"[DEBUG] audio_bytes extracted type: {type(audio_bytes)}")

#             if audio_bytes is None:
#                 return {"error": "No audio found in video"}

#             audio_segment = AudioSegment.from_file(audio_bytes)
#             wav_io = BytesIO()
#             audio_segment.export(wav_io, format="wav")
#             wav_io.seek(0)

#             wav_resampled = resample_audio_to_16k(wav_io)
#             wav_bytes = wav_resampled.read()
#             print(f"[DEBUG] wav_bytes length: {len(wav_bytes)}")

#             inputs = self.processor(wav_bytes, sampling_rate=16000, return_tensors="pt", padding=True)
#             with torch.no_grad():
#                 logits = self.asr_model(**inputs).logits
#             pred_ids = torch.argmax(logits, dim=-1)
#             transcript = self.processor.batch_decode(pred_ids)[0]
#             print("[DEBUG] Video transcript generated")
#             return transcript.strip()

#         except Exception as e:
#             print(f"[ERROR] Video processing exception: {str(e)}")
#             return {"error": f"Video processing failed: {str(e)}"}
