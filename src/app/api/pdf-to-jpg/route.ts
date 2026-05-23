import { NextResponse } from "next/server"
import { pdfToJpg } from "@/lib/pdf/pdf-to-jpg"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { r2Key } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    const images = await pdfToJpg(r2Key)

    return NextResponse.json({ images })
  } catch (e) {
    const message = e instanceof Error ? e.message : "转换失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
