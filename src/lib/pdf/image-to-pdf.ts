import { readFile, writeFile, mkdir } from "fs/promises"
import { join, basename } from "path"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")

export async function imagesToPdf(imageBuffers: Buffer[]): Promise<Buffer> {
  const { PDFDocument, PageSizes } = await import("pdf-lib")

  const doc = await PDFDocument.create()

  for (const buf of imageBuffers) {
    let image
    const header = buf.slice(0, 4).toString("hex")

    if (header.startsWith("ffd8")) {
      image = await doc.embedJpg(buf)
    } else if (header === "89504e47") {
      image = await doc.embedPng(buf)
    } else {
      image = await doc.embedPng(buf)
    }

    const page = doc.addPage([image.width, image.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    })
  }

  return Buffer.from(await doc.save())
}
