"""Add watermark to PDF using PyMuPDF"""
import sys
import json
import fitz

def main():
    if len(sys.argv) != 4:
        print("Usage: python watermark.py input.pdf output.pdf options.json", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    opts = json.loads(sys.argv[3])

    text = opts.get("text", "机密")
    fontsize = opts.get("fontSize", 40)
    opacity = opts.get("opacity", 0.15)
    rotation = opts.get("rotation", -45)
    color = opts.get("color", [0.5, 0.5, 0.5])

    doc = fitz.open(input_pdf)

    for page in doc:
        pw = page.rect.width
        ph = page.rect.height
        cx = pw / 2
        cy = ph / 2

        # Calculate step to tile watermark across page
        step_x = pw / 2.5
        step_y = ph / 2.5

        offsets = [
            (-step_x, -step_y), (0, -step_y), (step_x, -step_y),
            (-step_x, 0),       (0, 0),       (step_x, 0),
            (-step_x, step_y),  (0, step_y),  (step_x, step_y),
        ]

        for ox, oy in offsets:
            # Center the text at each grid position
            x = cx + ox
            y = cy + oy

            # Insert text with rotation via morph parameter
            # PyMuPDF morph: (point, matrix) where point is fixed point for rotation
            morph = (fitz.Point(x, y), fitz.Matrix(fitz.Identity).prerotate(rotation))
            page.insert_text(
                fitz.Point(x, y),
                text,
                fontsize=fontsize,
                fontname="china-s",
                fontfile="C:/Windows/Fonts/simhei.ttf" if sys.platform == "win32" else "/usr/share/fonts/truetype/simhei.ttf",
                color=color,
                fill_opacity=opacity,
                morph=morph,
                overlay=True,
            )

    doc.save(output_pdf)
    doc.close()

if __name__ == "__main__":
    main()
