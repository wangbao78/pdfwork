import { NextResponse } from "next/server"
import { reorderPdf, getPageCount } from "@/lib/pdf/reorder"
import { cleanupOld } from "@/lib/cleanup"
import { updateFileStatus } from "@/lib/file-status"

export async function POST(req: Request) {
  cleanupOld()
  let rk = ""
  try {
    const { r2Key, order } = await req.json()
    rk = r2Key

    if (!rk || typeof rk !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }
    if (!Array.isArray(order) || order.length === 0 || order.length > 200) {
      return NextResponse.json({ error: "排序数据无效" }, { status: 400 })
    }

    await updateFileStatus(rk, "PROCESSING")
    const result = await reorderPdf(rk, order)

    await updateFileStatus(rk, "DONE")
    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
      pageCount: result.pageCount,
    })
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "排序失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
