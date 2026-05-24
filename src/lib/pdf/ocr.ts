import { exec } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, mkdir, unlink, readdir } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { existsSync } from "fs"

const execP = promisify(exec)

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

function findPython(): string | null {
  if (existsSync("/usr/bin/python3")) return "python3"
  return null
}

export interface OcrResult {
  pages: number
  text: string
  downloadUrl: string
}

export async function ocrPdf(r2Key: string): Promise<OcrResult> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)
  const outputDir = join(tmpDir, "ocr_out")
  await mkdir(outputDir, { recursive: true })

  const fileId = r2Key.split("/")[1]
  const buf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  await writeFile(inputPath, buf)

  const script = join(process.cwd(), "scripts", "ocr_pdf.py")
  const python = findPython()
  if (!python) throw new Error("Python 不可用")

  try {
    const cmd = `${python} "${script}" "${inputPath}" "${outputDir}"`
    const { stdout } = await execP(cmd, { timeout: 300_000 })

    const data = JSON.parse(stdout.trim())
    if (!data.docx) throw new Error("OCR 识别无结果")

    const docxBuf = await readFile(data.docx)
    const resultName = `ocr-${inputName.replace(/\.pdf$/i, ".docx")}`
    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, resultName)
    await writeFile(resultPath, docxBuf)

    return {
      pages: data.pages,
      text: data.text.slice(0, 5000),
      downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
    }
  } finally {
    unlink(inputPath).catch(() => {})
  }
}
