import { NextResponse } from "next/server"
import { watermarkPdf, type WatermarkOptions } from "@/lib/pdf/watermark"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { r2Key, text, fontSize, opacity, rotation, color } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "请输入水印文字" }, { status: 400 })
    }
    if (text.length > 100) {
      return NextResponse.json({ error: "水印文字不超过 100 字" }, { status: 400 })
    }

    const options: WatermarkOptions = {
      text: text.trim(),
      fontSize: Math.min(Math.max(fontSize || 40, 10), 100),
      opacity: Math.min(Math.max(opacity ?? 0.15, 0.01), 1),
      rotation: Math.min(Math.max(rotation ?? -45, -90), 90),
      color: Array.isArray(color) && color.length === 3
        ? (color as [number, number, number])
        : [0.5, 0.5, 0.5],
    }

    const result = await watermarkPdf(r2Key, options)

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "水印添加失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
