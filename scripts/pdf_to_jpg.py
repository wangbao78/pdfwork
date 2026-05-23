"""Convert PDF pages to JPG images using PyMuPDF"""
import sys
import os
import json
import fitz

def main():
    if len(sys.argv) != 3:
        print("Usage: python pdf_to_jpg.py input.pdf output_dir", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_dir = sys.argv[2]
    os.makedirs(output_dir, exist_ok=True)

    doc = fitz.open(input_pdf)
    images = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        # Render at 200 DPI
        pix = page.get_pixmap(dpi=200)
        filename = f"page_{page_num+1}.jpg"
        filepath = os.path.join(output_dir, filename)
        pix.save(filepath)

        images.append({
            "page": page_num + 1,
            "filename": filename,
            "width": pix.width,
            "height": pix.height,
            "size": os.path.getsize(filepath),
        })

    doc.close()
    print(json.dumps(images, ensure_ascii=False))

if __name__ == "__main__":
    main()
