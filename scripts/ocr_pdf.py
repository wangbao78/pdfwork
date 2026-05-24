"""OCR text from scanned PDF using Tesseract + PyMuPDF"""
import sys
import json
import os
import subprocess
import fitz
from docx import Document

def main():
    if len(sys.argv) != 3:
        print("Usage: python ocr_pdf.py input.pdf output_dir", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_dir = sys.argv[2]
    os.makedirs(output_dir, exist_ok=True)

    doc = fitz.open(input_pdf)
    total = len(doc)
    full_text = []

    for page_num in range(total):
        page = doc[page_num]
        # Render page at 300 DPI for better OCR
        pix = page.get_pixmap(dpi=300)
        img_path = os.path.join(output_dir, f"page_{page_num+1}.png")
        pix.save(img_path)

        # OCR with Tesseract (Chinese simplified + English)
        txt_path = os.path.join(output_dir, f"page_{page_num+1}")
        subprocess.run([
            "tesseract", img_path, txt_path,
            "-l", "chi_sim+eng",
            "--psm", "6",
        ], capture_output=True, timeout=60)

        txt_file = txt_path + ".txt"
        if os.path.exists(txt_file):
            with open(txt_file, "r", encoding="utf-8") as f:
                page_text = f.read().strip()
        else:
            page_text = ""

        full_text.append(page_text)
        os.remove(img_path)  # Clean up image

    doc.close()

    # Create Word document
    docx_path = os.path.join(output_dir, "ocr_result.docx")
    word_doc = Document()
    for i, text in enumerate(full_text):
        if text:
            word_doc.add_paragraph(f"第 {i+1} 页").bold = True
            word_doc.add_paragraph(text)
            word_doc.add_paragraph()  # blank line
    word_doc.save(docx_path)

    # Output as JSON
    result = {
        "pages": total,
        "text": "\n\n".join(full_text),
        "docx": docx_path,
    }
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
