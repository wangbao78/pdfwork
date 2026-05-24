import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { headers } from "next/headers"
import { getUploadUrl } from "@/lib/r2"
import { db } from "@/lib/db"
import { checkRateLimit, apiError } from "@/lib/api-utils"
import { cleanupOld } from "@/lib/cleanup"
import { getAccessUser, checkQuota, checkGuestQuota, trackUsage } from "@/lib/access"

const UPLOAD_DIR = join(process.cwd(), ".data", "uploads")
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

function cuid(): string {
  const t = Date.now().toString(36)
  const r = () => Math.random().toString(36).slice(2, 6)
  return `${t}${r()}${r()}`
}

function isPdfHeader(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46
}

const TOOL_BY_PATH: Record<string, string> = {
  "pdf-to-word": "PDF 转 Word",
  "pdf-to-jpg": "PDF 转 JPG",
  "extract-images": "提取图片",
  "image-to-pdf": "图片转 PDF",
  "merge-pdf": "合并 PDF",
  "split-pdf": "拆分 PDF",
  "rotate-pdf": "旋转 PDF",
  "reorder-pdf": "页面排序",
  "compress-pdf": "压缩 PDF",
  watermark: "文字水印",
  "page-number": "PDF 页码",
  "image-watermark": "图片水印",
  ocr: "OCR 识别",
  "protect-pdf": "加密/解锁",
  batch: "批量处理",
}

function detectTool(req: Request): string | null {
  try {
    const ref = req.headers.get("referer") || ""
    const match = ref.match(/\/tools\/([^/?]+)/)
    if (match) return TOOL_BY_PATH[match[1]] || null
  } catch {}
  return null
}

export async function POST(req: Request) {
  cleanupOld()
  try {
    // Rate limit: 20 uploads per minute per IP
    const ip = (await headers()).get("x-forwarded-for") || "unknown"
    const tool = detectTool(req)
    if (!checkRateLimit(`upload:${ip}`, 20, 60_000)) {
      return apiError("请求过于频繁，请稍后再试", 429)
    }

    // 限额检查
    const user = await getAccessUser()
    if (user.isGuest) {
      const guestErr = await checkGuestQuota(ip)
      if (guestErr) return apiError(guestErr, 429)
    } else {
      const quotaErr = await checkQuota(user, 0, 0)
      if (quotaErr) return apiError(quotaErr, 429)
    }

    // Local mode: accept file directly via multipart
    if (!isR2Configured) {
      const formData = await req.formData()
      const file = formData.get("file") as File | null

      if (!file) return apiError("未选择文件", 400)
      if (!file.name.toLowerCase().endsWith(".pdf")) return apiError("仅支持 PDF 文件", 400)
      if (file.size > MAX_FILE_SIZE) return apiError("文件大小超过 100MB 限制", 400)
      if (file.size === 0) return apiError("文件为空", 400)

      const buf = Buffer.from(await file.arrayBuffer())
      if (!isPdfHeader(buf)) return apiError("无效的 PDF 文件", 400)

      const fileId = cuid()
      const r2Key = `uploads/${fileId}/${file.name}`
      const localPath = join(UPLOAD_DIR, fileId)

      await mkdir(UPLOAD_DIR, { recursive: true })
      await writeFile(localPath, buf)

      try {
        await db.file.create({
          data: {
            id: fileId,
            name: file.name,
            size: buf.length,
            type: "application/pdf",
            status: "PENDING",
            r2Key,
            tool,
            ip,
            userId: user.id || null,
            expiresAt: new Date(Date.now() + 3600 * 1000),
          },
        })
      } catch { /* no DB */ }

      trackUsage(user)
      return NextResponse.json({ fileId, r2Key, local: true })
    }

    // R2 mode: return presigned URL
    const { name, size } = await req.json()

    if (!name || typeof name !== "string") return apiError("缺少文件名", 400)
    if (!size || typeof size !== "number" || size <= 0) return apiError("文件大小无效", 400)
    if (!name.toLowerCase().endsWith(".pdf")) return apiError("仅支持 PDF 文件", 400)

    const fileId = cuid()
    const r2Key = `uploads/${fileId}/${name}`
    const uploadUrl = await getUploadUrl(r2Key)

    try {
      await db.file.create({
        data: {
          id: fileId,
          name,
          size,
          type: "application/pdf",
          status: "PENDING",
          r2Key,
          tool,
          ip,
          userId: user.id || null,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
    } catch { /* no DB */ }

    return NextResponse.json({ fileId, r2Key, uploadUrl })
  } catch {
    return apiError("上传失败", 500)
  }
}
