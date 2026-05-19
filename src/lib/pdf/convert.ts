import { execFile } from "child_process"
import { promisify } from "util"
import { writeFile, readFile, unlink, mkdir } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { existsSync } from "fs"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { PdfConverter, ConversionResult } from "./types"

const execFileP = promisify(execFile)

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

function findPython(): { cmd: string; venv?: boolean } {
  // In Docker: python3
  // On Windows: prefer .venv\Scripts\python.exe, then python
  const venvPython = join(process.cwd(), "..", ".venv", "Scripts", "python.exe")
  if (existsSync(venvPython)) return { cmd: venvPython, venv: true }
  // Try python3 (Alpine) then python
  return { cmd: "python3" }
}

/** Convert PDF to DOCX using pdf2docx (Python) */
async function doConvert(inputPath: string): Promise<Buffer> {
  const outputDir = tmpdir()
  const baseName = basename(inputPath).replace(/\.pdf$/i, "")
  const outputPath = join(outputDir, `${baseName}.docx`)
  const script = join(process.cwd(), "scripts", "convert.py")

  const python = findPython()

  // Try pdf2docx via Python first
  try {
    await execFileP(python.cmd, [script, inputPath, outputPath], {
      timeout: 120_000,
    })
    const buf = await readFile(outputPath)
    if (buf.length === 0) throw new Error("转换结果为空")
    unlink(outputPath).catch(() => {})
    return buf
  } catch (e: any) {
    const msg = (e.stderr || e.message || "").toString()

    // If Python not found, try LibreOffice
    if (msg.includes("command not found") || msg.includes("ENOENT")) {
      return doLibreOfficeConvert(inputPath, outputPath)
    }

    // If pdf2docx module not installed, try LibreOffice
    if (msg.includes("ModuleNotFoundError") || msg.includes("No module named")) {
      return doLibreOfficeConvert(inputPath, outputPath)
    }

    if (msg.includes("encrypted") || msg.includes("password")) {
      throw new Error("此 PDF 已加密，无法转换")
    }
    throw new Error(`转换失败: ${msg.slice(0, 200)}`)
  }
}

/** Fallback: LibreOffice headless conversion */
async function doLibreOfficeConvert(inputPath: string, outputPath: string): Promise<Buffer> {
  const outputDir = tmpdir()
  try {
    await execFileP("libreoffice", [
      "--headless", "--convert-to", "docx", "--outdir", outputDir, inputPath,
    ], { timeout: 120_000 })

    const buf = await readFile(outputPath)
    if (buf.length === 0) throw new Error("转换结果为空")
    unlink(outputPath).catch(() => {})
    return buf
  } catch (e: any) {
    const msg = (e.stderr || e.message || "").toString()
    if (msg.includes("command not found") || msg.includes("ENOENT")) {
      // Try soffice (Windows/Alpine alternate name)
      try {
        await execFileP("soffice", [
          "--headless", "--convert-to", "docx", "--outdir", outputDir, inputPath,
        ], { timeout: 120_000 })
        const buf = await readFile(outputPath)
        if (buf.length === 0) throw new Error("转换结果为空")
        unlink(outputPath).catch(() => {})
        return buf
      } catch (e2: any) {
        const m2 = (e2.stderr || e2.message || "").toString()
        if (m2.includes("command not found") || m2.includes("ENOENT")) {
          throw new Error("PDF 转换引擎未安装，请联系管理员")
        }
        throw new Error(`转换失败: ${m2.slice(0, 200)}`)
      }
    }
    throw new Error(`转换失败: ${msg.slice(0, 200)}`)
  }
}

class R2Converter implements PdfConverter {
  async convert(r2Key: string): Promise<ConversionResult> {
    const inputName = basename(r2Key)
    const tmpDir = tmpdir()
    const inputPath = join(tmpDir, inputName)

    const downloadUrl = await getDownloadUrl(r2Key)
    const res = await fetch(downloadUrl)
    if (!res.ok) throw new Error(`下载源文件失败: ${res.status}`)
    await writeFile(inputPath, Buffer.from(await res.arrayBuffer()))

    const resultBuf = await doConvert(inputPath)
    unlink(inputPath).catch(() => {})

    const resultKey = r2Key.replace(/\.pdf$/i, ".docx")
    const uploadUrl = await getUploadUrl(resultKey)
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: new Uint8Array(resultBuf),
    })
    if (!uploadRes.ok) throw new Error(`上传结果失败: ${uploadRes.status}`)

    const resultDownloadUrl = await getDownloadUrl(resultKey)
    return { resultKey, downloadUrl: resultDownloadUrl }
  }
}

class LocalConverter implements PdfConverter {
  async convert(r2Key: string): Promise<ConversionResult> {
    const parts = r2Key.split("/")
    const fileId = parts[1]
    const inputPath = join(LOCAL_DIR, "uploads", fileId)

    const inputBuf = await readFile(inputPath)
    const tmpDir = tmpdir()
    const inputName = parts[2] || "input.pdf"
    const tmpInput = join(tmpDir, inputName)
    await writeFile(tmpInput, inputBuf)

    const resultBuf = await doConvert(tmpInput)
    unlink(tmpInput).catch(() => {})

    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultName = basename(r2Key).replace(/\.pdf$/i, ".docx")
    const resultPath = join(LOCAL_RESULTS, `${fileId}-${resultName}`)
    await writeFile(resultPath, resultBuf)

    const resultKey = `results/${fileId}/${resultName}`
    return {
      resultKey,
      downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
    }
  }
}

export const pdfConverter: PdfConverter = isR2Configured
  ? new R2Converter()
  : new LocalConverter()
