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

    def ocr_image(img_data, img_name):
        """Run OCR on a single image bytes, return text"""
        img_path = os.path.join(output_dir, img_name)
        with open(img_path, "wb") as f:
            f.write(img_data)
        best = ""
        for psm in [3, 6, 4]:
            txt_path = os.path.join(output_dir, img_name.rsplit(".", 1)[0])
            result = subprocess.run([
                "tesseract", img_path, txt_path,
                "-l", "chi_sim+eng",
                "--psm", str(psm),
            ], capture_output=True, timeout=120)
            if result.returncode != 0:
                continue
            tf = txt_path + ".txt"
            if os.path.exists(tf):
                with open(tf, "r", encoding="utf-8") as f:
                    text = f.read().strip()
                if len(text) > len(best):
                    best = text
        os.remove(img_path)
        return best

    for page_num in range(total):
        page = doc[page_num]
        images = page.get_images(full=True)

        # 1. Extract embedded text
        page_text = page.get_text().strip()
        if page_text:
            full_text.append(page_text)

        # 2. OCR embedded images at native resolution
        for img_idx, img_info in enumerate(images):
            xref = img_info[0]
            try:
                base = doc.extract_image(xref)
                img_data = base["image"]
                img_ext = base["ext"]
                img_name = f"page{page_num+1}_img{img_idx+1}.{img_ext}"
                text = ocr_image(img_data, img_name)
                if text:
                    full_text.append(text)
            except Exception:
                pass

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
