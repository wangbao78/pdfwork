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

    # Check tesseract availability and languages
    tesseract_check = subprocess.run(["tesseract", "--list-langs"], capture_output=True, timeout=10)
    if tesseract_check.returncode != 0:
        raise Exception(f"Tesseract not found: {tesseract_check.stderr.decode('utf-8', errors='ignore')[:200]}")

    available_langs = tesseract_check.stdout.decode("utf-8", errors="ignore")
    if "chi_sim" not in available_langs:
        raise Exception(f"Chinese language pack missing. Available: {available_langs.strip().replace(chr(10),', ')}")

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
        # Test PSM modes in order: 3=auto, 6=block, 4=single column
        page_text = ""
        for psm in [3, 6, 4]:
            txt_path = os.path.join(output_dir, f"page_{page_num+1}")
            result = subprocess.run([
                "tesseract", img_path, txt_path,
                "-l", "chi_sim+eng",
                "--psm", str(psm),
            ], capture_output=True, timeout=120)

            if result.returncode != 0:
                err = result.stderr.decode("utf-8", errors="ignore")[:200]
                raise Exception(f"Tesseract error (page {page_num+1}, psm={psm}): {err}")

            txt_file = txt_path + ".txt"
            if os.path.exists(txt_file):
                with open(txt_file, "r", encoding="utf-8") as f:
                    page_text = f.read().strip()
            if page_text:
                break  # Got text, done

        if not page_text:
            continue  # 跳过空白页

        full_text.append(page_text)
        os.remove(img_path)  # Clean up image

    doc.close()

    # Create Word document
    docx_path = os.path.join(output_dir, "ocr_result.docx")
    word_doc = Document()
    for text in full_text:
        if text:
            word_doc.add_paragraph(text)
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
