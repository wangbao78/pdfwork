import { readFile, writeFile, mkdir } from "fs/promises"
import { join, basename } from "path"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

/** 解析页码字符串 "1-3,5,7-9" → [1,2,3,5,7,8,9]（页码从 1 开始） */
export function parsePageRange(input: string, totalPages: number): number[] {
  const pages = new Set<number>()
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean)

  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number)
      if (isNaN(a) || isNaN(b)) continue
      const start = Math.max(1, Math.min(a, b))
      const end = Math.min(totalPages, Math.max(a, b))
      for (let i = start; i <= end; i++) {
        pages.add(i)
      }
    } else {
      const n = Number(part)
      if (!isNaN(n) && n >= 1 && n <= totalPages) {
        pages.add(n)
      }
    }
  }

  return [...pages].sort((a, b) => a - b)
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

export interface SplitResult extends ConversionResult {
  pageCount: number
}

export async function splitPdf(
  r2Key: string,
  pages: number[],
): Promise<SplitResult> {
  const { PDFDocument } = await import("pdf-lib")

  const inputBuf = await getFileBuffer(r2Key)
  const srcDoc = await PDFDocument.load(inputBuf)
  const totalPages = srcDoc.getPageCount()

  // 过滤超出范围的页码
  const validPages = pages.filter((p) => p >= 1 && p <= totalPages)
  if (validPages.length === 0) throw new Error("没有有效的页码范围")

  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(
    srcDoc,
    validPages.map((p) => p - 1), // pdf-lib 页码从 0 开始
  )
  for (const page of copiedPages) {
    newDoc.addPage(page)
  }

  const resultBytes = await newDoc.save()
  const inputName = basename(r2Key).replace(/\.pdf$/i, ".pdf")
  const resultName = `split-${inputName}`

  if (isR2Configured) {
    const resultKey = `split/${Date.now().toString(36)}-${resultName}`
    const uploadUrl = await getUploadUrl(resultKey)
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: new Uint8Array(resultBytes),
    })
    if (!uploadRes.ok) throw new Error(`上传拆分结果失败: ${uploadRes.status}`)
    return {
      resultKey,
      downloadUrl: await getDownloadUrl(resultKey),
      pageCount: validPages.length,
    }
  }

  await mkdir(LOCAL_RESULTS, { recursive: true })
  const resultPath = join(LOCAL_RESULTS, resultName)
  await writeFile(resultPath, Buffer.from(resultBytes))
  return {
    resultKey: `results/split/${resultName}`,
    downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
    pageCount: validPages.length,
  }
}
