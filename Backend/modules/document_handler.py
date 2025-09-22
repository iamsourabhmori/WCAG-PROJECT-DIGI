# modules>document_handler.py
import os
import docx
import PyPDF2

def extract_text_lines(file_path: str):
    """
    Extracts text lines from PDF, DOCX, or TXT.
    Always returns a list of clean strings.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    lines = []

    # Handle PDF
    if file_path.lower().endswith(".pdf"):
        with open(file_path, "rb") as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    # Ensure each line is plain string
                    lines.extend(str(line) for line in text.splitlines())

    # Handle DOCX
    elif file_path.lower().endswith(".docx"):
        doc = docx.Document(file_path)
        for para in doc.paragraphs:
            if para.text and para.text.strip():
                lines.append(str(para.text.strip()))

    # Handle TXT
    elif file_path.lower().endswith(".txt"):
        with open(file_path, "r", encoding="utf-8") as f:
            lines = [str(line) for line in f.read().splitlines()]

    else:
        raise ValueError("Unsupported file type. Please upload PDF, DOCX, or TXT.")

    # Final cleanup: guarantee only clean strings
    return [str(line).strip() for line in lines if str(line).strip()]

