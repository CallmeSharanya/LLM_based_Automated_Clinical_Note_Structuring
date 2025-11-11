# ocr_utils.py
import os
from pdf2image import convert_from_path
from PIL import Image
import pytesseract
import tempfile

def extract_text_from_image(image_path: str) -> str:
    """Basic pytesseract OCR for an image."""
    image = Image.open(image_path)
    text = pytesseract.image_to_string(image, lang='eng')
    return text

def extract_text_from_pdf(pdf_path: str) -> str:
    """Convert PDF pages to images and run OCR on each page."""
    # pdf2image uses poppler; ensure it's installed in the system.
    pages = convert_from_path(pdf_path, dpi=200)
    texts = []
    for page in pages:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            page.save(tmp.name, 'PNG')
            texts.append(extract_text_from_image(tmp.name))
            os.unlink(tmp.name)
    return "\n".join(texts)

def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Utility when file is uploaded in-memory."""
    ext = filename.split('.')[-1].lower()
    with tempfile.NamedTemporaryFile(suffix='.' + ext, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        path = tmp.name
    try:
        if ext in ['png', 'jpg', 'jpeg', 'tiff', 'bmp']:
            text = extract_text_from_image(path)
        elif ext in ['pdf']:
            text = extract_text_from_pdf(path)
        elif ext in ['txt']:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        else:
            # fallback try image OCR
            text = extract_text_from_image(path)
    finally:
        try:
            os.unlink(path)
        except:
            pass
    return text
