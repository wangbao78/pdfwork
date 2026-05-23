import { readFile, writeFile, mkdir } from "fs/promises"
import { join, basename } from "path"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")
const FONT_PATH = join(process.cwd(), "scripts", "simhei.ttf")

export interface WatermarkOptions {
  text: string
  fontSize?: number      // 默认 40
  opacity?: number       // 0-1, 默认 0.15
  rotation?: number      // 角度, 默认 -45
  color?: [number, number, number] // RGB, 默认 [128,128,128]
}

async function getFileBuffer(key: string): Promise<ArrayBuffer> {
  if (isR2Configured) {
    const downloadUrl = await getDownloadUrl(key)
    const res = await fetch(downloadUrl)
    if (!res.ok) throw new Error(`下载源文件失败: ${res.status}`)
    return res.arrayBuffer()
  }
  const fileId = key.split("/")[1]
  const buf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

export async function watermarkPdf(
  r2Key: string,
  options: WatermarkOptions,
): Promise<ConversionResult> {
  const { PDFDocument, rgb, StandardFonts, degrees } = await import("pdf-lib")

  const {
    text,
    fontSize = 40,
    opacity = 0.15,
    rotation = -45,
    color = [0.5, 0.5, 0.5],
  } = options

  const inputBuf = await getFileBuffer(r2Key)
  const pdfDoc = await PDFDocument.load(inputBuf)

  // 嵌入中文字体
  let font
  try {
    const fontBytes = await readFile(FONT_PATH)
    font = await pdfDoc.embedFont(fontBytes)
  } catch {
    // 回退到内置字体（不支持中文但至少能用）
    font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  }

  const pages = pdfDoc.getPages()
  const c = rgb(color[0], color[1], color[2])

  for (const page of pages) {
    const { width, height } = page.getSize()

    // 在页面中心和四周铺水印
    const cx = width / 2
    const cy = height / 2
    const stepX = width / 2.5
    const stepY = height / 2.5
    const offsets = [
      [-stepX, -stepY], [0, -stepY], [stepX, -stepY],
      [-stepX, 0],       [0, 0],      [stepX, 0],
      [-stepX, stepY],   [0, stepY],  [stepX, stepY],
    ]

    for (const [ox, oy] of offsets) {
      page.drawText(text, {
        x: cx + ox - 120,
        y: cy + oy - fontSize / 2,
        size: fontSize,
        font,
        color: c,
        opacity,
        rotate: degrees(rotation),
      })
    }
  }

  const resultBytes = await pdfDoc.save()
  const inputName = basename(r2Key).replace(/\.pdf$/i, ".pdf")
  const resultName = `watermarked-${inputName}`

  if (isR2Configured) {
    const resultKey = `watermarked/${Date.now().toString(36)}-${resultName}`
    const uploadUrl = await getUploadUrl(resultKey)
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: new Uint8Array(resultBytes),
    })
    if (!uploadRes.ok) throw new Error(`上传水印结果失败: ${uploadRes.status}`)
    return { resultKey, downloadUrl: await getDownloadUrl(resultKey) }
  }

  await mkdir(LOCAL_RESULTS, { recursive: true })
  const resultPath = join(LOCAL_RESULTS, resultName)
  await writeFile(resultPath, Buffer.from(resultBytes))
  return {
    resultKey: `results/watermarked/${resultName}`,
    downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
  }
}
