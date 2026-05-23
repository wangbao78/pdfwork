import { NextResponse } from "next/server"
import { splitPdf, parsePageRange } from "@/lib/pdf/split"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { r2Key, pages } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }
    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: "请选择要保留的页码" }, { status: 400 })
    }
    if (pages.length > 100) {
      return NextResponse.json({ error: "最多保留 100 页" }, { status: 400 })
    }

    const result = await splitPdf(r2Key, pages)

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
      pageCount: result.pageCount,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "拆分处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
