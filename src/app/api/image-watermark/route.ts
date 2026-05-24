import { NextResponse } from "next/server"
import { imageWatermarkPdf } from "@/lib/pdf/image-watermark"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"
import { updateFileStatus } from "@/lib/file-status"

export async function POST(req: Request) {
  const block = await requirePro(req)
  if (block) return block
  cleanupOld()
  let rk = ""
  try {
    const formData = await req.formData()
    const r2Key = formData.get("r2Key") as string
    rk = r2Key
    const wmFile = formData.get("watermark") as File | null

    if (!rk || !wmFile) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 })
    }
    if (wmFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "水印图片不超过 10MB" }, { status: 400 })
    }

    const wmBuf = Buffer.from(await wmFile.arrayBuffer())
    const ext = wmFile.name.split(".").pop() || "png"

    await updateFileStatus(rk, "PROCESSING", "图片水印")
    const downloadUrl = await imageWatermarkPdf(rk, wmBuf, ext, {
      opacity: Number(formData.get("opacity")) || 0.3,
      scale: Number(formData.get("scale")) || 0.25,
    })

    trackUsage(await getAccessUser())
    await updateFileStatus(rk, "DONE")
    return NextResponse.json({ downloadUrl })
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "水印添加失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
