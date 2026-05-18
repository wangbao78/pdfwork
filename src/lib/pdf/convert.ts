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

/** Convert PDF to DOCX — uses LibreOffice on Linux, pdf2docx on Windows */
async function doConvert(inputPath: string): Promise<Buffer> {
  const outputDir = tmpdir()
  const baseName = basename(inputPath).replace(/\.pdf$/i, "")
  const outputPath = join(outputDir, `${baseName}.docx`)

  // Linux/Docker: use LibreOffice
  try {
    await execFileP("libreoffice", [
      "--headless", "--convert-to", "docx", "--outdir", outputDir, inputPath,
    ], { timeout: 120_000 })

    const buf = await readFile(outputPath)
    if (buf.length === 0) throw new Error("空文件")
    unlink(outputPath).catch(() => {})
    return buf
  } catch (e: any) {
    const msg = (e.stderr || e.message || "").toString()
    // If LibreOffice is not available, try pdf2docx fallback (Windows dev)
    if (msg.includes("command not found") || msg.includes("ENOENT")) {
      return doPdf2docxConvert(inputPath, outputPath)
    }
    if (msg.includes("encrypted") || msg.includes("password")) {
      throw new Error("此 PDF 已加密，无法转换")
    }
    throw new Error(`转换失败: ${msg.slice(0, 200)}`)
  }
}

/** Fallback: use pdf2docx Python script (Windows dev) */
async function doPdf2docxConvert(inputPath: string, outputPath: string): Promise<Buffer> {
  const script = join(process.cwd(), "scripts", "convert.py")
  const python = existsSync(
    join(process.cwd(), "..", ".venv", "Scripts", "python.exe"),
  )
    ? join(process.cwd(), "..", ".venv", "Scripts", "python.exe")
    : "python"

  try {
    await execFileP(python, [script, inputPath, outputPath], { timeout: 120_000 })
  } catch (e: any) {
    const msg = (e.stderr || e.message || "").toString()
    if (msg.includes("encrypted") || msg.includes("password")) {
      throw new Error("此 PDF 已加密，无法转换")
    }
    throw new Error(`pdf2docx 转换失败: ${msg.slice(0, 200)}`)
  }

  const buf = await readFile(outputPath)
  if (buf.length === 0) throw new Error("转换结果为空")
  unlink(outputPath).catch(() => {})
  return buf
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
