import { NextResponse } from "next/server"
import { addPageNumbers } from "@/lib/pdf/page-number"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { r2Key, position, fontSize, color } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    const positions = [
      "bottom-center", "bottom-right", "bottom-left",
      "top-center", "top-right", "top-left",
    ]
    const pos = positions.includes(position) ? position : "bottom-center"

    const downloadUrl = await addPageNumbers(r2Key, {
      position: pos,
      fontSize: Math.min(Math.max(fontSize || 10, 6), 30),
      color: Array.isArray(color) && color.length === 3 ? (color as [number, number, number]) : [0, 0, 0],
    })

    return NextResponse.json({ downloadUrl })
  } catch (e) {
    const message = e instanceof Error ? e.message : "添加页码失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
