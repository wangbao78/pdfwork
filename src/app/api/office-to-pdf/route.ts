import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { headers } from "next/headers"
import { officeToPdf } from "@/lib/pdf/office-to-pdf"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"
import { db } from "@/lib/db"
import { updateFileStatus } from "@/lib/file-status"

const UPLOAD_DIR = join(process.cwd(), ".data", "office-uploads")

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
  const r2Key = `uploads/${fileId}`

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "未选择文件" }, { status: 400 })

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不超过 50MB" }, { status: 400 })
    }

    const allowed = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "仅支持 Word、Excel、PPT" }, { status: 400 })
    }

    const user = await getAccessUser()

    // Create file record
    try {
      await db.file.create({
        data: {
          id: fileId,
          name: file.name,
          size: file.size,
          type: ext,
          status: "PENDING",
          r2Key,
          tool: "Office 转 PDF",
          ip,
          userId: user.id || null,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
    } catch { /* no DB */ }

    await mkdir(UPLOAD_DIR, { recursive: true })
    const tmpPath = join(UPLOAD_DIR, file.name)
    await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()))

    await updateFileStatus(r2Key, "PROCESSING", "Office 转 PDF")
    const result = await officeToPdf(tmpPath, file.name)

    trackUsage(user)
    await updateFileStatus(r2Key, "DONE")

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    await updateFileStatus(r2Key, "ERROR")
    const message = e instanceof Error ? e.message : "转换失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
