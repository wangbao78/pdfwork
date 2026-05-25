"""PDF to DOCX converter using pdf2docx with blank page filtering"""
import sys
import fitz
from pdf2docx import Converter

BLANK_TEXT_THRESHOLD = 20  # 少于 20 个字符视为空白页

def is_blank(page):
    """检查页面是否空白：无文字且无图片"""
    text = page.get_text().strip()
    if len(text) >= BLANK_TEXT_THRESHOLD:
        return False
    # 检查是否有嵌入图片
    images = page.get_images()
    if images:
        return False
    return True

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert.py input.pdf output.docx", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]

    # 先分析哪些页面非空白
    doc = fitz.open(input_pdf)
    total_pages = len(doc)
    non_blank = [i for i in range(total_pages) if not is_blank(doc[i])]
    doc.close()

    if not non_blank:
        print("所有页面均为空白，取消转换", file=sys.stderr)
        sys.exit(1)

    # 只转换非空白页
    cv = Converter(input_pdf)
    cv.convert(output_docx, pages=non_blank)
    cv.close()
    print(f"OK ({len(non_blank)}/{total_pages} 页)")

if __name__ == "__main__":
    main()
