import { execFile } from "child_process"
import { promisify } from "util"
import { writeFile, readFile, unlink, mkdir } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

import { platform } from "os"

const execFileP = promisify(execFile)

// Ghostscript binary name differs by platform
const GS_CMD =
  platform() === "win32" ? "gswin64c" : "gs"

// Add common Ghostscript install paths to PATH for child process
const GS_PATHS = platform() === "win32"
  ? ["D:\\Ghostscript\\bin", "C:\\Program Files\\gs\\gs10.04.0\\bin"]
  : []

function getEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>
  if (GS_PATHS.length > 0) {
    env.PATH = [...GS_PATHS, env.PATH || ""].join(";")
  }
  return env
}

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

export type CompressLevel = "standard" | "high" | "extreme"

const GS_SETTINGS: Record<CompressLevel, string> = {
  standard: "/ebook",
  high: "/screen",
  extreme: "/screen",
}

export async function compressPdf(
  r2Key: string,
  level: CompressLevel = "standard",
): Promise<ConversionResult & { originalSize: number; compressedSize: number }> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)
  const outputName = inputName.replace(/\.pdf$/i, "_compressed.pdf")
  const outputPath = join(tmpDir, outputName)

  // 1. Get file buffer
  let inputBuf: Buffer
  if (isR2Configured) {
    const sourceUrl = await getDownloadUrl(r2Key)
    const res = await fetch(sourceUrl)
    if (!res.ok) throw new Error(`下载源文件失败: ${res.status}`)
    inputBuf = Buffer.from(await res.arrayBuffer())
  } else {
    const fileId = r2Key.split("/")[1]
    inputBuf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  }

  const originalSize = inputBuf.length
  await writeFile(inputPath, inputBuf)

  try {
    // 2. Compress via Ghostscript
    const args = [
      "-sDEVICE=pdfwrite",
      `-dPDFSETTINGS=${GS_SETTINGS[level]}`,
      "-dNOPAUSE",
      "-dBATCH",
      "-dSAFER",
      `-sOutputFile=${outputPath}`,
    ]

    if (level === "extreme") {
      args.push("-dCompressPages=true", "-dDetectDuplicateImages=true")
      args.push("-dDownsampleColorImages=true", "-dColorImageResolution=72")
      args.push("-dDownsampleGrayImages=true", "-dGrayImageResolution=72")
      args.push("-dDownsampleMonoImages=true", "-dMonoImageResolution=72")
    }

    args.push(inputPath)

    try {
      await execFileP(GS_CMD, args, { timeout: 120_000, env: getEnv() })
    } catch (e: any) {
      const msg = e.stderr || e.message || ""
      if (msg.includes("command not found") || msg.includes("ENOENT")) {
        throw new Error("Ghostscript 未安装")
      }
      throw new Error(`压缩失败: ${msg.slice(0, 200)}`)
    }

    // 3. Read result
    let compressedBuf: Buffer
    try {
      compressedBuf = await readFile(outputPath)
    } catch {
      throw new Error("压缩结果未生成")
    }

    // 4. If result is larger, return original
    if (compressedBuf.length >= originalSize) {
      const downloadUrl = isR2Configured
        ? await getDownloadUrl(r2Key)
        : `/api/download?file=${encodeURIComponent(join(LOCAL_DIR, "uploads", r2Key.split("/")[1]))}`
      return { resultKey: r2Key, downloadUrl, originalSize, compressedSize: compressedBuf.length }
    }

    // 5. Upload/save result
    let resultKey: string
    let downloadUrl: string

    if (isR2Configured) {
      resultKey = `compressed/${Date.now().toString(36)}-${inputName}`
      const uploadUrl = await getUploadUrl(resultKey)
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: new Uint8Array(compressedBuf),
      })
      if (!uploadRes.ok) throw new Error(`上传压缩结果失败: ${uploadRes.status}`)
      downloadUrl = await getDownloadUrl(resultKey)
    } else {
      await mkdir(LOCAL_RESULTS, { recursive: true })
      const savedName = `compressed-${inputName}`
      const resultPath = join(LOCAL_RESULTS, savedName)
      await writeFile(resultPath, compressedBuf)
      resultKey = `results/compressed/${savedName}`
      downloadUrl = `/api/download?file=${encodeURIComponent(resultPath)}`
    }

    return { resultKey, downloadUrl, originalSize, compressedSize: compressedBuf.length }
  } finally {
    Promise.allSettled([unlink(inputPath), unlink(outputPath)])
  }
}
