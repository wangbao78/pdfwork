"""Extract images from PDF using PyMuPDF"""
import sys
import json
import os
import fitz

def main():
    if len(sys.argv) != 3:
        print("Usage: python extract_images.py input.pdf output_dir", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_dir = sys.argv[2]
    os.makedirs(output_dir, exist_ok=True)

    doc = fitz.open(input_pdf)
    images = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        img_list = page.get_images(full=True)

        for img_idx, img_info in enumerate(img_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                img_bytes = base_image["image"]
                ext = base_image["ext"]
                w = base_image["width"]
                h = base_image["height"]

                filename = f"page{page_num+1}_img{img_idx+1}.{ext}"
                filepath = os.path.join(output_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(img_bytes)

                images.append({
                    "page": page_num + 1,
                    "index": img_idx + 1,
                    "filename": filename,
                    "width": w,
                    "height": h,
                    "size": len(img_bytes),
                    "format": ext,
                })
            except Exception as e:
                print(f"Warning: failed to extract image xref={xref}: {e}", file=sys.stderr)

    doc.close()
    print(json.dumps(images, ensure_ascii=False))

if __name__ == "__main__":
    main()
