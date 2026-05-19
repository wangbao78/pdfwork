import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, readFile, unlink, mkdir } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { existsSync } from "fs"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { PdfConverter, ConversionResult } from "./types"

const execP = promisify(exec)

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

/** Find usable Python for pdf2docx (Windows dev) */
function findPython(): string | null {
  const venvPython = join(process.cwd(), "..", ".venv", "Scripts", "python.exe")
  if (existsSync(venvPython)) return venvPython
  return null
}

/** Convert PDF to DOCX using LibreOffice (via shell for PATH resolution) */
async function doLibreOfficeConvert(inputPath: string): Promise<Buffer> {
  const outputDir = tmpdir()
  const baseName = basename(inputPath).replace(/\.pdf$/i, "")
  const outputPath = join(outputDir, `${baseName}.docx`)

  const cmd = `soffice --headless --convert-to docx --outdir "${outputDir}" "${inputPath}"`

  try {
    const { stderr } = await execP(cmd, { timeout: 120_000 })
    if (stderr && !stderr.includes("Warning")) {
      throw new Error(stderr)
    }
    const buf = await readFile(outputPath)
    if (buf.length === 0) throw new Error("转换结果为空白")
    unlink(outputPath).catch(() => {})
    return buf
  } catch (e: any) {
    const msg = (e.stderr || e.message || "").toString()
    if (msg.includes("command not found") || msg.includes("not found") || e.code === 127) {
      throw new Error("LibreOffice 未安装，无法转换")
    }
    if (msg.includes("encrypted") || msg.includes("password")) {
      throw new Error("此 PDF 已加密，无法转换")
    }
    throw new Error(`转换失败: ${msg.slice(0, 200)}`)
  }
}

/** Convert PDF to DOCX using pdf2docx Python script */
async function doPdf2docxConvert(inputPath: string): Promise<Buffer> {
  const outputDir = tmpdir()
  const baseName = basename(inputPath).replace(/\.pdf$/i, "")
  const outputPath = join(outputDir, `${baseName}.docx`)
  const script = join(process.cwd(), "scripts", "convert.py")
  const python = findPython()

  if (!python) throw new Error("pdf2docx 不可用")

  const cmd = `"${python}" "${script}" "${inputPath}" "${outputPath}"`

  try {
    const { stderr } = await execP(cmd, { timeout: 120_000 })
    if (stderr && stderr.includes("Error")) throw new Error(stderr)
    const buf = await readFile(outputPath)
    if (buf.length === 0) throw new Error("转换结果为空")
    unlink(outputPath).catch(() => {})
    return buf
  } catch (e: any) {
    const msg = (e.stderr || e.message || "").toString()
    if (msg.includes("encrypted") || msg.includes("password")) {
      throw new Error("此 PDF 已加密，无法转换")
    }
    throw new Error(`pdf2docx 转换失败: ${msg.slice(0, 200)}`)
  }
}

/** Main entry: try LO first, fallback to pdf2docx on Windows dev */
async function doConvert(inputPath: string): Promise<Buffer> {
  try {
    return await doLibreOfficeConvert(inputPath)
  } catch (e: any) {
    const msg = (e.message || "").toString()
    // If LO not installed, fallback to pdf2docx (Windows dev)
    if (msg.includes("未安装")) {
      return doPdf2docxConvert(inputPath)
    }
    throw e
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
