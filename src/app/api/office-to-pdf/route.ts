import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { officeToPdf } from "@/lib/pdf/office-to-pdf"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"

const UPLOAD_DIR = join(process.cwd(), ".data", "office-uploads")

export async function POST(req: Request) {
  const block = await requirePro(req)
  if (block) return block
  cleanupOld()

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

    await mkdir(UPLOAD_DIR, { recursive: true })
    const tmpPath = join(UPLOAD_DIR, file.name)
    await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()))

    const result = await officeToPdf(tmpPath, file.name)

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "转换失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
