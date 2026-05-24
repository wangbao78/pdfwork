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

    opacity = opts.get("opacity", 0.3)
    scale = opts.get("scale", 0.25)

    doc = fitz.open(input_pdf)

    # Prepare watermark pixmap with alpha
    wm_img = fitz.open(watermark_img)
    wm_pix = wm_img[0].get_pixmap(alpha=True)

    # Create pixmap with reduced alpha
    samples = bytearray(wm_pix.samples)
    # samples are RGBA: R,G,B,A,R,G,B,A,...
    for i in range(3, len(samples), 4):
        samples[i] = int(samples[i] * opacity)

    alpha_pix = fitz.Pixmap(fitz.csRGB, wm_pix.width, wm_pix.height, samples)

    for page in doc:
        pw = page.rect.width
        ph = page.rect.height

        # Scale to percentage of page width
        wm_w = pw * scale
        wm_h = wm_pix.height * (wm_w / wm_pix.width)

        # Center position
        cx = (pw - wm_w) / 2
        cy = (ph - wm_h) / 2

        page.insert_image(
            fitz.Rect(cx, cy, cx + wm_w, cy + wm_h),
            pixmap=alpha_pix,
            overlay=True,
        )

    output_pdf = input_pdf.rsplit(".pdf", 1)[0] + "_水印.pdf"
    doc.save(output_pdf)
    doc.close()
    wm_img.close()
    print(f"OK:{output_pdf}")

if __name__ == "__main__":
    main()
