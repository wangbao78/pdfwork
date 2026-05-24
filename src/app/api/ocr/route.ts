import { NextResponse } from "next/server"
import { ocrPdf } from "@/lib/pdf/ocr"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"

export async function POST(req: Request) {
  const block = await requirePro(req)
  if (block) return block
  cleanupOld()

  try {
    const { r2Key } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    if (!r2Key.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "仅支持 PDF 文件" }, { status: 400 })
    }

    const result = await ocrPdf(r2Key)

    trackUsage(await getAccessUser())
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : "OCR 识别失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
