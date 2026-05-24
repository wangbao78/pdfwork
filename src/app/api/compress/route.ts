import { NextResponse } from "next/server"
import { compressPdf, type CompressLevel } from "@/lib/pdf/compress"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"
import { updateFileStatus } from "@/lib/file-status"

export async function POST(req: Request) {
  cleanupOld()
  let rk = ""
  try {
    const { r2Key, level } = await req.json()
    rk = r2Key

    if (!rk || typeof rk !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    const validLevels: CompressLevel[] = ["standard", "high", "extreme"]
    const compressLevel: CompressLevel = validLevels.includes(level) ? level : "standard"

    if (compressLevel === "extreme") {
      const block = await requirePro(req)
      if (block) return block
    }

    await updateFileStatus(rk, "PROCESSING")
    const result = await compressPdf(rk, compressLevel)

    trackUsage(await getAccessUser())
    await updateFileStatus(rk, "DONE")
    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      noReduction: result.compressedSize >= result.originalSize,
    })
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "压缩处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
