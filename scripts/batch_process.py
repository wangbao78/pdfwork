"""Batch process multiple PDFs and zip results"""
import sys
import json
import os
import zipfile
import subprocess
import fitz

def convert_pdf(input_path, output_dir):
    """PDF to Word via LibreOffice"""
    cmd = f'soffice --headless --convert-to docx --outdir "{output_dir}" "{input_path}"'
    subprocess.run(cmd, shell=True, timeout=120, capture_output=True)
    name = os.path.basename(input_path).rsplit(".pdf", 1)[0] + ".docx"
    out = os.path.join(output_dir, name)
    if os.path.exists(out):
        return out
    # Fallback: PyMuPDF -> pdf2docx
    try:
        from pdf2docx import Converter
        out = os.path.join(output_dir, name)
        cv = Converter(input_path)
        cv.convert(out)
        cv.close()
        return out
    except:
        raise Exception(f"转换失败: {name}")

def compress_pdf(input_path, output_dir, level="standard"):
    """Compress PDF via Ghostscript"""
    name = os.path.basename(input_path).rsplit(".pdf", 1)[0] + "_compressed.pdf"
    out = os.path.join(output_dir, name)
    settings = {"standard": "/ebook", "high": "/screen"}
    dpi = settings.get(level, "/ebook")
    cmd = f'gs -sDEVICE=pdfwrite -dPDFSETTINGS={dpi} -dNOPAUSE -dBATCH -sOutputFile="{out}" "{input_path}"'
    subprocess.run(cmd, shell=True, timeout=120, capture_output=True)
    if os.path.exists(out):
        return out
    raise Exception(f"压缩失败: {name}")

def watermark_text(input_path, output_dir, text, opts):
    """Add text watermark via PyMuPDF"""
    name = os.path.basename(input_path).rsplit(".pdf", 1)[0] + "_水印.pdf"
    out = os.path.join(output_dir, name)
    doc = fitz.open(input_path)
    fontsize = opts.get("fontSize", 40)
    opacity = opts.get("opacity", 0.15)
    rotation = opts.get("rotation", -45)

    for page in doc:
        pw = page.rect.width
        ph = page.rect.height
        cx, cy = pw / 2, ph / 2
        step_x, step_y = pw / 2.5, ph / 2.5
        offsets = [
            (-step_x, -step_y), (0, -step_y), (step_x, -step_y),
            (-step_x, 0),       (0, 0),       (step_x, 0),
            (-step_x, step_y),  (0, step_y),  (step_x, step_y),
        ]
        morph = (fitz.Point(0, 0), fitz.Matrix(fitz.Identity).prerotate(rotation))
        for ox, oy in offsets:
            page.insert_text(
                fitz.Point(cx + ox, cy + oy),
                text,
                fontsize=fontsize,
                fontname="china-s",
                fontfile="/usr/share/fonts/truetype/simhei.ttf",
                color=(0.5, 0.5, 0.5),
                fill_opacity=opacity,
                morph=morph,
                overlay=True,
            )
    doc.save(out)
    doc.close()
    return out

def main():
    if len(sys.argv) != 3:
        print("Usage: python batch_process.py input.json output_dir", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)
    output_dir = sys.argv[2]
    os.makedirs(output_dir, exist_ok=True)

    operation = data.get("operation", "convert")
    files = data.get("files", [])  # [{path, name}, ...]
    watermark_text_val = data.get("watermarkText", "机密")
    compress_level = data.get("compressLevel", "standard")

    results = []
    for f in files:
        try:
            if operation == "convert":
                out = convert_pdf(f["path"], output_dir)
            elif operation == "compress":
                out = compress_pdf(f["path"], output_dir, compress_level)
            elif operation == "watermark":
                out = watermark_text(f["path"], output_dir, watermark_text_val, {})
            else:
                raise Exception(f"Unknown operation: {operation}")
            results.append({"ok": True, "name": os.path.basename(out), "path": out})
        except Exception as e:
            results.append({"ok": False, "name": f.get("name", "unknown"), "error": str(e)})

    # Create zip of successful results
    zip_path = os.path.join(output_dir, "batch_results.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for r in results:
            if r["ok"]:
                zf.write(r["path"], r["name"])

    print(json.dumps({"results": results, "zip": zip_path}, ensure_ascii=False))

if __name__ == "__main__":
    main()
