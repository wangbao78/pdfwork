"""PDF to DOCX converter using pdf2docx"""
import sys
from pdf2docx import Converter

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert.py input.pdf output.docx", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]

    cv = Converter(input_pdf)
    cv.convert(output_docx)
    cv.close()
    print("OK")

if __name__ == "__main__":
    main()
