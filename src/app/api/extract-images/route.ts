import { NextResponse } from "next/server"
import { extractImages } from "@/lib/pdf/extract-images"
import { cleanupOld } from "@/lib/cleanup"
import { updateFileStatus } from "@/lib/file-status"

export async function POST(req: Request) {
  cleanupOld()
  let rk = ""
  try {
    const { r2Key } = await req.json()
    rk = r2Key

    if (!rk || typeof rk !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    if (!rk.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "仅支持 PDF 文件" }, { status: 400 })
    }

    await updateFileStatus(rk, "PROCESSING", "提取图片")
    const images = await extractImages(rk)

    await updateFileStatus(rk, "DONE")
    return NextResponse.json({ images })
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "图片提取失败"
    if (message.includes("没有可提取")) {
      return NextResponse.json({ error: message }, { status: 200 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
