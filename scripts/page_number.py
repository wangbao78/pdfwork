"""Add page numbers to PDF using PyMuPDF"""
import sys
import json
import fitz

def main():
    if len(sys.argv) != 3:
        print("Usage: python page_number.py input.pdf options.json", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    opts = json.loads(sys.argv[2])

    position = opts.get("position", "bottom-center")  # bottom-center, bottom-right, top-center, etc.
    font_size = opts.get("fontSize", 10)
    text_color = opts.get("color", [0, 0, 0])

    doc = fitz.open(input_pdf)
    total = len(doc)

    for i, page in enumerate(doc):
        page_num = i + 1
        text = str(page_num)

        pw = page.rect.width
        ph = page.rect.height
        margin = 30

        # Determine text position
        if position == "bottom-center":
            x = pw / 2 - 10
            y = ph - margin
        elif position == "bottom-right":
            x = pw - margin - 20
            y = ph - margin
        elif position == "bottom-left":
            x = margin
            y = ph - margin
        elif position == "top-center":
            x = pw / 2 - 10
            y = margin
        elif position == "top-right":
            x = pw - margin - 20
            y = margin
        elif position == "top-left":
            x = margin
            y = margin
        else:
            x = pw / 2 - 10
            y = ph - margin

        page.insert_text(
            fitz.Point(x, y),
            text,
            fontsize=font_size,
            fontname="helv",
            color=text_color,
        )

    output_pdf = input_pdf.rsplit(".pdf", 1)[0] + "_页码.pdf"
    doc.save(output_pdf)
    doc.close()
    print(f"OK:{output_pdf}")

if __name__ == "__main__":
    main()
