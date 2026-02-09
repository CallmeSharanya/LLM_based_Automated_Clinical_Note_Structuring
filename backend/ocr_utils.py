# ocr_utils.py
import os
from PIL import Image
import pytesseract
import tempfile
import io

# Configure Tesseract path for Windows (if not in PATH)
if os.name == 'nt':  # Windows
    tesseract_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\sampa\AppData\Local\Tesseract-OCR\tesseract.exe",
    ]
    for path in tesseract_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            print(f"✅ Tesseract found at: {path}")
            break

# Try to import PyMuPDF (fitz) for PDF processing - doesn't require poppler
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("⚠️ PyMuPDF not installed. PDF processing will be limited.")

# Fallback to pdf2image if available
try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False


def extract_text_from_image(image_path: str) -> str:
    """Basic pytesseract OCR for an image."""
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image, lang='eng')
        return text
    except Exception as e:
        print(f"❌ OCR error: {e}")
        return ""


def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """OCR directly from image bytes."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image, lang='eng')
        return text
    except Exception as e:
        print(f"❌ OCR error from bytes: {e}")
        return ""


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF (primary) or pdf2image (fallback)."""
    
    # Try PyMuPDF first (no external dependencies!)
    if PYMUPDF_AVAILABLE:
        try:
            doc = fitz.open(pdf_path)
            texts = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # First try direct text extraction (works for text PDFs)
                text = page.get_text()
                
                if text.strip():
                    texts.append(text)
                else:
                    # If no text, it's a scanned PDF - use OCR on the image
                    print(f"📄 Page {page_num + 1}: No text found, using OCR...")
                    
                    # Render page to image at 200 DPI
                    mat = fitz.Matrix(200/72, 200/72)  # 200 DPI
                    pix = page.get_pixmap(matrix=mat)
                    
                    # Convert to PIL Image
                    img_bytes = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_bytes))
                    
                    # OCR the image
                    ocr_text = pytesseract.image_to_string(image, lang='eng')
                    texts.append(ocr_text)
            
            doc.close()
            return "\n".join(texts)
            
        except Exception as e:
            print(f"❌ PyMuPDF error: {e}")
    
    # Fallback to pdf2image (requires poppler)
    if PDF2IMAGE_AVAILABLE:
        try:
            pages = convert_from_path(pdf_path, dpi=200)
            texts = []
            for page in pages:
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    page.save(tmp.name, 'PNG')
                    texts.append(extract_text_from_image(tmp.name))
                    os.unlink(tmp.name)
            return "\n".join(texts)
        except Exception as e:
            print(f"❌ pdf2image error: {e}")
    
    return ""


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Utility when file is uploaded in-memory."""
    ext = filename.split('.')[-1].lower()
    
    # For images, try OCR directly from bytes first
    if ext in ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp']:
        try:
            text = extract_text_from_image_bytes(file_bytes)
            if text.strip():
                return text
        except:
            pass
    
    # For PDFs with PyMuPDF, we can process from bytes directly
    if ext == 'pdf' and PYMUPDF_AVAILABLE:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            texts = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                
                if text.strip():
                    texts.append(text)
                else:
                    # Scanned page - try OCR if available, otherwise skip
                    print(f"📄 Page {page_num + 1}: No embedded text, trying OCR...")
                    try:
                        mat = fitz.Matrix(200/72, 200/72)
                        pix = page.get_pixmap(matrix=mat)
                        img_bytes = pix.tobytes("png")
                        image = Image.open(io.BytesIO(img_bytes))
                        ocr_text = pytesseract.image_to_string(image, lang='eng')
                        if ocr_text.strip():
                            texts.append(ocr_text)
                    except Exception as ocr_err:
                        print(f"⚠️ OCR not available: {ocr_err}")
                        # Just note that this page couldn't be processed
                        texts.append(f"[Page {page_num + 1}: Scanned content - requires OCR]")
            
            doc.close()
            return "\n".join(texts)
        except Exception as e:
            print(f"❌ PDF bytes processing error: {e}")
    
    # Fallback: write to temp file and process
    with tempfile.NamedTemporaryFile(suffix='.' + ext, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        path = tmp.name
    
    try:
        if ext in ['png', 'jpg', 'jpeg', 'tiff', 'bmp', 'webp']:
            text = extract_text_from_image(path)
        elif ext in ['pdf']:
            text = extract_text_from_pdf(path)
        elif ext in ['txt']:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        else:
            # fallback try image OCR
            text = extract_text_from_image(path)
    except Exception as e:
        print(f"❌ File processing error: {e}")
        text = ""
    finally:
        try:
            os.unlink(path)
        except:
            pass
    
    return text

