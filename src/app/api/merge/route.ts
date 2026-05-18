import { NextResponse } from "next/server"
import { mergePdfs } from "@/lib/pdf/merge"

export async function POST(req: Request) {
  try {
    const { r2Keys } = await req.json()

    if (!r2Keys || !Array.isArray(r2Keys) || r2Keys.length < 2) {
      return NextResponse.json(
        { error: "至少需要两个 PDF 文件" },
        { status: 400 },
      )
    }

    if (r2Keys.length > 20) {
      return NextResponse.json(
        { error: "最多支持 20 个文件" },
        { status: 400 },
      )
    }

    const result = await mergePdfs(r2Keys)

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "合并处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
