import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { htmlToPdf } from "@/lib/pdf/html-to-pdf"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"
import { db } from "@/lib/db"
import { updateFileStatus } from "@/lib/file-status"

function cuid(): string {
  const t = Date.now().toString(36)
  const r = () => Math.random().toString(36).slice(2, 6)
  return `${t}${r()}${r()}`
}

export async function POST(req: Request) {
  const block = await requirePro(req)
  if (block) return block
  cleanupOld()

  const ip = (await headers()).get("x-forwarded-for") || "unknown"
  const fileId = cuid()
  const r2Key = `results/html-to-pdf/${fileId}`

  try {
    const { html } = await req.json()

    if (!html || typeof html !== "string" || html.trim().length === 0) {
      return NextResponse.json({ error: "请输入 HTML 内容" }, { status: 400 })
    }
    if (html.length > 500_000) {
      return NextResponse.json({ error: "HTML 内容超过 500KB" }, { status: 400 })
    }

    const user = await getAccessUser()

    // Create file record
    try {
      await db.file.create({
        data: {
          id: fileId,
          name: "html-to-pdf.pdf",
          size: html.length,
          type: "text/html",
          status: "PENDING",
          r2Key,
          tool: "HTML 转 PDF",
          ip,
          userId: user.id || null,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
    } catch { /* no DB */ }

    await updateFileStatus(r2Key, "PROCESSING", "HTML 转 PDF")
    const downloadUrl = await htmlToPdf(html.trim())

    trackUsage(user)
    await updateFileStatus(r2Key, "DONE")

    return NextResponse.json({ downloadUrl })
  } catch (e) {
    await updateFileStatus(r2Key, "ERROR")
    const message = e instanceof Error ? e.message : "转换失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
