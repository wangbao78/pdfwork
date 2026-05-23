import { NextResponse } from "next/server"
import { compressPdf, type CompressLevel } from "@/lib/pdf/compress"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()
  try {
    const { r2Key, level } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json(
        { error: "缺少文件标识" },
        { status: 400 },
      )
    }

    const validLevels: CompressLevel[] = ["standard", "high", "extreme"]
    const compressLevel: CompressLevel = validLevels.includes(level) ? level : "standard"

    const result = await compressPdf(r2Key, compressLevel)

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
