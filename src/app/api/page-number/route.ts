import { NextResponse } from "next/server"
import { addPageNumbers } from "@/lib/pdf/page-number"
import { cleanupOld } from "@/lib/cleanup"
import { updateFileStatus } from "@/lib/file-status"

export async function POST(req: Request) {
  cleanupOld()
  let rk = ""
  try {
    const { r2Key, position, fontSize, color } = await req.json()
    rk = r2Key

    if (!rk || typeof rk !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    const positions = [
      "bottom-center", "bottom-right", "bottom-left",
      "top-center", "top-right", "top-left",
    ]
    const pos = positions.includes(position) ? position : "bottom-center"

    await updateFileStatus(rk, "PROCESSING", "PDF 页码")
    const downloadUrl = await addPageNumbers(rk, {
      position: pos,
      fontSize: Math.min(Math.max(fontSize || 10, 6), 30),
      color: Array.isArray(color) && color.length === 3 ? (color as [number, number, number]) : [0, 0, 0],
    })

    await updateFileStatus(rk, "DONE")
    return NextResponse.json({ downloadUrl })
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "添加页码失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
