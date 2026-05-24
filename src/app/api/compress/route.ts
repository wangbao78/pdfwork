import { NextResponse } from "next/server"
import { compressPdf, type CompressLevel } from "@/lib/pdf/compress"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"

export async function POST(req: Request) {
  cleanupOld()
  try {
    const { r2Key, level } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    const validLevels: CompressLevel[] = ["standard", "high", "extreme"]
    const compressLevel: CompressLevel = validLevels.includes(level) ? level : "standard"

    // 极限压缩需要 Pro
    if (compressLevel === "extreme") {
      const block = await requirePro(req)
      if (block) return block
    }

    const result = await compressPdf(r2Key, compressLevel)

    trackUsage(await getAccessUser())
    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      noReduction: result.compressedSize >= result.originalSize,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "压缩处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
