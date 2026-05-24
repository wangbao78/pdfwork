import { NextResponse } from "next/server"
import { htmlToPdf } from "@/lib/pdf/html-to-pdf"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { html } = await req.json()

    if (!html || typeof html !== "string" || html.trim().length === 0) {
      return NextResponse.json({ error: "请输入 HTML 内容" }, { status: 400 })
    }
    if (html.length > 500_000) {
      return NextResponse.json({ error: "HTML 内容超过 500KB" }, { status: 400 })
    }

    const downloadUrl = await htmlToPdf(html.trim())

    return NextResponse.json({ downloadUrl })
  } catch (e) {
    const message = e instanceof Error ? e.message : "转换失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
