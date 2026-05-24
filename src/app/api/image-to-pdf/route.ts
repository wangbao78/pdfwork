import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { headers } from "next/headers"
import { imagesToPdf } from "@/lib/pdf/image-to-pdf"
import { cleanupOld } from "@/lib/cleanup"
import { getAccessUser, checkQuota, checkGuestQuota, trackUsage } from "@/lib/access"
import { db } from "@/lib/db"
import { updateFileStatus } from "@/lib/file-status"

const LOCAL_RESULTS = join(process.cwd(), ".data", "results")

function cuid(): string {
  const t = Date.now().toString(36)
  const r = () => Math.random().toString(36).slice(2, 6)
  return `${t}${r()}${r()}`
}

export async function POST(req: Request) {
  cleanupOld()

  try {
    const ip = (await headers()).get("x-forwarded-for") || "unknown"
    const user = await getAccessUser()
    if (user.isGuest) {
      const guestErr = await checkGuestQuota(ip)
      if (guestErr) return NextResponse.json({ error: guestErr }, { status: 429 })
    } else {
      const quotaErr = await checkQuota(user, 0, 0)
      if (quotaErr) return NextResponse.json({ error: quotaErr }, { status: 429 })
    }

    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "请选择图片" }, { status: 400 })
    }
    if (files.length > 30) {
      return NextResponse.json({ error: "最多 30 张图片" }, { status: 400 })
    }

    const buffers: Buffer[] = []
    const totalSize = files.reduce((s, f) => s + f.size, 0)
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: "单张图片不超过 20MB" }, { status: 400 })
      }
      buffers.push(Buffer.from(await f.arrayBuffer()))
    }

    const fileId = cuid()
    const r2Key = `results/images-to-pdf/${fileId}`
    const fileName = files[0].name.replace(/\.[^.]+$/, "") + ".pdf"

    // Create file record
    try {
      await db.file.create({
        data: {
          id: fileId,
          name: fileName,
          size: totalSize,
          type: "image/pdf",
          status: "PENDING",
          r2Key,
          tool: "图片转 PDF",
          ip,
          userId: user.id || null,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
    } catch { /* no DB */ }

    await updateFileStatus(r2Key, "PROCESSING", "图片转 PDF")
    const resultBuf = await imagesToPdf(buffers)
    const resultName = `${fileId}.pdf`

    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, resultName)
    await writeFile(resultPath, resultBuf)

    trackUsage(user)
    await updateFileStatus(r2Key, "DONE")

    return NextResponse.json({
      downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
      resultKey: `results/images-to-pdf/${resultName}`,
      pageCount: files.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "转换失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
