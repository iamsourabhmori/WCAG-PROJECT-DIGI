

# modules/image_handler.py

from PIL import Image
from io import BytesIO
import requests
from modules.huggingface_model import load_image_caption_model


# ------------------------
# Image loading helper
# ------------------------
def load_image(file_or_url):
    """
    Load image from uploaded file, URL, or BytesIO into PIL.Image.
    Args:
        file_or_url: BytesIO, UploadedFile, or URL string
    Returns:
        PIL.Image (RGB)
    """
    try:
        if hasattr(file_or_url, "read"):  # Django/Streamlit UploadedFile
            img = Image.open(file_or_url).convert("RGB")
        elif isinstance(file_or_url, BytesIO):
            file_or_url.seek(0)
            img = Image.open(file_or_url).convert("RGB")
        elif isinstance(file_or_url, str) and file_or_url.startswith("http"):
            resp = requests.get(file_or_url, stream=True, timeout=10)
            resp.raise_for_status()
            img = Image.open(BytesIO(resp.content)).convert("RGB")
        else:
            raise ValueError("Unsupported image input type. Must be file, BytesIO, or URL.")

        # Resize large images for efficiency
        max_size = (512, 512)
        # img.thumbnail(max_size, Image.ANTIALIAS)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)


        return img
    except Exception as e:
        raise ValueError(f"Failed to load image: {e}")


# ------------------------
# Image captioning function
# ------------------------
def generate_image_caption(image_pil):
    """
    Generate a short description/caption for the image using BLIP model.
    Args:
        image_pil: PIL.Image
    Returns:
        str: generated caption
    """
    processor, model = load_image_caption_model()

    try:
        inputs = processor(images=image_pil, return_tensors="pt")
        outputs = model.generate(**inputs, max_new_tokens=40)  # Keep concise
        caption = processor.decode(outputs[0], skip_special_tokens=True).strip()

        return caption
    except Exception as e:
        raise RuntimeError(f"Image captioning failed: {e}")
