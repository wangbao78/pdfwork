"""Add image watermark to PDF using PyMuPDF"""
import sys
import json
import fitz

def main():
    if len(sys.argv) != 4:
        print("Usage: python image_watermark.py input.pdf watermark.png options.json", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    watermark_img = sys.argv[2]
    opts = json.loads(sys.argv[3])

    scale = opts.get("scale", 0.25)

    doc = fitz.open(input_pdf)
    wm_img = fitz.open(watermark_img)
    wm_bytes = wm_img[0].get_pixmap().tobytes("png")

    for page in doc:
        pw = page.rect.width
        ph = page.rect.height
        wm_w = pw * scale
        wm_h = wm_img[0].rect.height * (wm_w / wm_img[0].rect.width)
        cx = (pw - wm_w) / 2
        cy = (ph - wm_h) / 2

        page.insert_image(
            fitz.Rect(cx, cy, cx + wm_w, cy + wm_h),
            stream=wm_bytes,
            overlay=True,
        )

    output_pdf = input_pdf.rsplit(".pdf", 1)[0] + "_水印.pdf"
    doc.save(output_pdf)
    doc.close()
    wm_img.close()
    print(f"OK:{output_pdf}")

if __name__ == "__main__":
    main()
