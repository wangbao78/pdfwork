import { readFile, writeFile, mkdir } from "fs/promises"
import { join, basename } from "path"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

export async function reorderPdf(
  r2Key: string,
  order: number[],
): Promise<ConversionResult & { pageCount: number }> {
  const { PDFDocument } = await import("pdf-lib")

  const fileId = r2Key.split("/")[1]
  const buf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  const srcDoc = await PDFDocument.load(buf)
  const total = srcDoc.getPageCount()

  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(
    srcDoc,
    order.map((p) => p - 1).filter((i) => i >= 0 && i < total),
  )
  for (const page of copiedPages) {
    newDoc.addPage(page)
  }

  const resultBytes = await newDoc.save()
  const resultName = `reordered-${basename(r2Key).replace(/\.pdf$/i, ".pdf")}`

  await mkdir(LOCAL_RESULTS, { recursive: true })
  const resultPath = join(LOCAL_RESULTS, resultName)
  await writeFile(resultPath, Buffer.from(resultBytes))

  return {
    resultKey: `results/reordered/${resultName}`,
    downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
    pageCount: copiedPages.length,
  }
}

export async function getPageCount(r2Key: string): Promise<number> {
  const { PDFDocument } = await import("pdf-lib")
  const fileId = r2Key.split("/")[1]
  const buf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  const doc = await PDFDocument.load(buf)
  return doc.getPageCount()
}
