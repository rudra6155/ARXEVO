import io
import PyPDF2
import docx
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(tags=["upload"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    # 1. Check file size using the underlying file object
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")

    # 2. Extract text based on file extension / content type
    extracted_text = ""
    filename = file.filename.lower()
    
    try:
        content = await file.read()
        
        if filename.endswith(".txt"):
            extracted_text = content.decode("utf-8", errors="replace")
            
        elif filename.endswith(".pdf"):
            pdf_file = io.BytesIO(content)
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                extracted_text += page.extract_text() + "\n"
                
        elif filename.endswith(".docx"):
            docx_file = io.BytesIO(content)
            doc = docx.Document(docx_file)
            extracted_text = "\n".join([para.text for para in doc.paragraphs])
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload .txt, .pdf, or .docx files.")
            
    except Exception as e:
        # Avoid exposing internal error details if not necessary, but log it if we had a logger
        raise HTTPException(status_code=400, detail=f"Failed to process file. {str(e)}")
        
    # 3. Validate extracted text length
    extracted_text = extracted_text.strip()
    if len(extracted_text) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from this file (minimum 50 characters).")
        
    # 4. Return extracted text. Privacy: By letting `content`, `extracted_text` drop out of scope, they are garbage collected.
    return {"text": extracted_text}
