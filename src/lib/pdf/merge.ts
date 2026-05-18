import { readFile, writeFile, mkdir } from "fs/promises"
import { join, basename } from "path"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

/** Get file content as ArrayBuffer from the appropriate source */
async function getFileBuffer(key: string): Promise<ArrayBuffer> {
  if (isR2Configured) {
    const downloadUrl = await getDownloadUrl(key)
    const res = await fetch(downloadUrl)
    if (!res.ok) throw new Error(`下载 ${key} 失败: ${res.status}`)
    return res.arrayBuffer()
  }
  // Local: key format is uploads/{fileId}/{filename}
  const fileId = key.split("/")[1]
  const buf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

export async function mergePdfs(r2Keys: string[]): Promise<ConversionResult> {
  const { PDFDocument } = await import("pdf-lib")
  const mergedDoc = await PDFDocument.create()

  for (const key of r2Keys) {
    const buf = await getFileBuffer(key)
    const doc = await PDFDocument.load(buf)
    const pages = await mergedDoc.copyPages(doc, doc.getPageIndices())
    for (const page of pages) {
      mergedDoc.addPage(page)
    }
  }

  const mergedBytes = await mergedDoc.save()

  if (isR2Configured) {
    const resultKey = `merged/${Date.now().toString(36)}-merged.pdf`
    const uploadUrl = await getUploadUrl(resultKey)
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: new Uint8Array(mergedBytes),
    })
    if (!uploadRes.ok) throw new Error(`上传合并结果失败: ${uploadRes.status}`)
    const downloadUrl = await getDownloadUrl(resultKey)
    return { resultKey, downloadUrl }
  }

  // Local mode
  await mkdir(LOCAL_RESULTS, { recursive: true })
  const resultName = "merged.pdf"
  const resultPath = join(LOCAL_RESULTS, resultName)
  await writeFile(resultPath, Buffer.from(mergedBytes))
  return {
    resultKey: `results/merged/${resultName}`,
    downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
  }
}
