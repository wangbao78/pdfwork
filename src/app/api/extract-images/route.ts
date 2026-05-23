import { NextResponse } from "next/server"
import { extractImages } from "@/lib/pdf/extract-images"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { r2Key } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    if (!r2Key.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "仅支持 PDF 文件" }, { status: 400 })
    }

    const images = await extractImages(r2Key)

    return NextResponse.json({ images })
  } catch (e) {
    const message = e instanceof Error ? e.message : "图片提取失败"
    if (message.includes("没有可提取")) {
      return NextResponse.json({ error: message }, { status: 200 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
