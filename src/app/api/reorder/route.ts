import { NextResponse } from "next/server"
import { reorderPdf, getPageCount } from "@/lib/pdf/reorder"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { r2Key, order } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }
    if (!Array.isArray(order) || order.length === 0 || order.length > 200) {
      return NextResponse.json({ error: "排序数据无效" }, { status: 400 })
    }

    const result = await reorderPdf(r2Key, order)

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
      pageCount: result.pageCount,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "排序失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
