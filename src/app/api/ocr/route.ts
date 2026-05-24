import { NextResponse } from "next/server"
import { ocrPdf } from "@/lib/pdf/ocr"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"
import { updateFileStatus } from "@/lib/file-status"

export async function POST(req: Request) {
  const block = await requirePro(req)
  if (block) return block
  cleanupOld()
  let rk = ""
  try {
    const { r2Key } = await req.json()
    rk = r2Key

    if (!rk || typeof rk !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    if (!rk.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "仅支持 PDF 文件" }, { status: 400 })
    }

    await updateFileStatus(rk, "PROCESSING")
    const result = await ocrPdf(rk)

    trackUsage(await getAccessUser())
    await updateFileStatus(rk, "DONE")
    return NextResponse.json(result)
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "OCR 识别失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
