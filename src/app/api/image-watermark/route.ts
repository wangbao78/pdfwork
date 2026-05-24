import { NextResponse } from "next/server"
import { imageWatermarkPdf } from "@/lib/pdf/image-watermark"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const formData = await req.formData()
    const r2Key = formData.get("r2Key") as string
    const wmFile = formData.get("watermark") as File | null

    if (!r2Key || !wmFile) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 })
    }
    if (wmFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "水印图片不超过 10MB" }, { status: 400 })
    }

    const wmBuf = Buffer.from(await wmFile.arrayBuffer())
    const ext = wmFile.name.split(".").pop() || "png"

    const downloadUrl = await imageWatermarkPdf(r2Key, wmBuf, ext, {
      opacity: Number(formData.get("opacity")) || 0.3,
      scale: Number(formData.get("scale")) || 0.25,
    })

    return NextResponse.json({ downloadUrl })
  } catch (e) {
    const message = e instanceof Error ? e.message : "水印添加失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
