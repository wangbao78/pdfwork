import { readFile, writeFile, mkdir } from "fs/promises"
import { join, basename } from "path"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

export type Rotation = 90 | 180 | 270

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

export async function rotatePdf(
  r2Key: string,
  rotation: Rotation,
): Promise<ConversionResult> {
  const { PDFDocument, degrees } = await import("pdf-lib")

  const inputBuf = await getFileBuffer(r2Key)
  const pdfDoc = await PDFDocument.load(inputBuf)

  const pages = pdfDoc.getPages()
  for (const page of pages) {
    const current = page.getRotation()
    page.setRotation(degrees(current.angle + rotation))
  }

  const resultBytes = await pdfDoc.save()
  const inputName = basename(r2Key).replace(/\.pdf$/i, ".pdf")
  const resultName = `rotated-${rotation}-${inputName}`

  if (isR2Configured) {
    const resultKey = `rotated/${Date.now().toString(36)}-${resultName}`
    const uploadUrl = await getUploadUrl(resultKey)
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: new Uint8Array(resultBytes),
    })
    if (!uploadRes.ok) throw new Error(`上传失败: ${uploadRes.status}`)
    return { resultKey, downloadUrl: await getDownloadUrl(resultKey) }
  }

  await mkdir(LOCAL_RESULTS, { recursive: true })
  const resultPath = join(LOCAL_RESULTS, resultName)
  await writeFile(resultPath, Buffer.from(resultBytes))
  return {
    resultKey: `results/rotated/${resultName}`,
    downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
  }
}
