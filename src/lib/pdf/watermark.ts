import { exec } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, mkdir, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { existsSync } from "fs"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

const execP = promisify(exec)

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

export interface WatermarkOptions {
  text: string
  fontSize?: number
  opacity?: number
  rotation?: number
  color?: [number, number, number]
}

function findPython(): string | null {
  if (existsSync("/usr/bin/python3")) return "python3"
  return null
}

export async function watermarkPdf(
  r2Key: string,
  options: WatermarkOptions,
): Promise<ConversionResult> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)
  const outputName = inputName.replace(/\.pdf$/i, "_watermarked.pdf")
  const outputPath = join(tmpDir, outputName)

  // Get source file
  let inputBuf: Buffer
  if (isR2Configured) {
    const downloadUrl = await getDownloadUrl(r2Key)
    const res = await fetch(downloadUrl)
    if (!res.ok) throw new Error(`下载源文件失败: ${res.status}`)
    inputBuf = Buffer.from(await res.arrayBuffer())
  } else {
    const fileId = r2Key.split("/")[1]
    inputBuf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  }

  await writeFile(inputPath, inputBuf)

  try {
    const script = join(process.cwd(), "scripts", "watermark.py")
    const python = findPython()

    if (!python) throw new Error("Python 不可用")

    const opts = JSON.stringify({
      text: options.text,
      fontSize: options.fontSize || 40,
      opacity: options.opacity ?? 0.15,
      rotation: options.rotation ?? -45,
      color: options.color || [0.5, 0.5, 0.5],
    })

    // Escape JSON for shell
    const escapedOpts = opts.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

    const cmd = `${python} "${script}" "${inputPath}" "${outputPath}" "${escapedOpts}"`

    try {
      const { stderr } = await execP(cmd, { timeout: 120_000 })
      if (stderr && stderr.includes("Error")) throw new Error(stderr)
    } catch (e: any) {
      const msg = (e.stderr || e.message || "").toString()
      throw new Error(`水印添加失败: ${msg.slice(0, 200)}`)
    }

    const resultBuf = await readFile(outputPath)
    if (resultBuf.length === 0) throw new Error("水印结果为空")

    if (isR2Configured) {
      const resultKey = `watermarked/${Date.now().toString(36)}-${outputName}`
      const uploadUrl = await getUploadUrl(resultKey)
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: new Uint8Array(resultBuf),
      })
      if (!uploadRes.ok) throw new Error(`上传失败: ${uploadRes.status}`)
      return { resultKey, downloadUrl: await getDownloadUrl(resultKey) }
    }

    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, outputName)
    await writeFile(resultPath, resultBuf)
    return {
      resultKey: `results/watermarked/${outputName}`,
      downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
    }
  } finally {
    unlink(inputPath).catch(() => {})
    unlink(outputPath).catch(() => {})
  }
}
