
# backend/api/crewai_agents/image_agent.py

from io import BytesIO
from PIL import Image
import streamlit as st
import requests
from modules.huggingface_model import load_image_caption_model
from modules.utils import display_image_with_caption, save_caption

class ImageAgent:
    """
    ImageAgent handles:
        1️⃣ Loading image file or URL
        2️⃣ Generating caption using BLIP model
        3️⃣ Optional real-time display in Streamlit
    """

    def __init__(self):
        self.processor, self.model = load_image_caption_model()

    def process_image(self, file=None, url=None, display_placeholder=None):
        """
        Process an image input (file or URL) and return caption.
        Args:
            file: uploaded image file (BytesIO or FileUpload)
            url: image URL (str)
            display_placeholder: Streamlit placeholder for display
        Returns:
            caption (str)
        """
        image_pil = self._load_image(file, url)
        if image_pil is None:
            return "❌ Failed to load image."

        caption = self._generate_caption(image_pil)

        # Optional: display in Streamlit
        if display_placeholder:
            display_image_with_caption(image_pil, caption, display_placeholder)

        # Optional: save caption locally
        save_caption(caption, original_file=getattr(file, "name", None))

        return caption

    def _load_image(self, file=None, url=None):
        """
        Load PIL.Image from file or URL
        """
        try:
            if file:
                if hasattr(file, "read"):
                    img = Image.open(file).convert("RGB")
                else:
                    img = Image.open(BytesIO(file)).convert("RGB")
            elif url:
                resp = requests.get(url, stream=True, timeout=10)
                resp.raise_for_status()
                img = Image.open(BytesIO(resp.content)).convert("RGB")
            else:
                return None
            return img
        except Exception as e:
            st.error(f"⚠️ Failed to load image: {e}")
            return None

    def _generate_caption(self, image_pil):
        """
        Generate a 2-3 line caption for the image using BLIP model
        """
        import torch

        try:
            inputs = self.processor(images=image_pil, return_tensors="pt")
            outputs = self.model.generate(**inputs, max_new_tokens=50)
            caption = self.processor.decode(outputs[0], skip_special_tokens=True)
            return caption
        except Exception as e:
            st.error(f"⚠️ Image captioning failed: {e}")
            return "Unable to generate caption"

# -----------------------------
# ✅ Backward compatibility function
# -----------------------------
def process_image_file(file=None, url=None, display_placeholder=None):
    """
    Function wrapper for ImageAgent for voice_controller.py imports.
    """
    agent = ImageAgent()
    return agent.process_image(file=file, url=url, display_placeholder=display_placeholder)
