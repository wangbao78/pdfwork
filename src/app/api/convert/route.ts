import { NextResponse } from "next/server"
import { pdfConverter } from "@/lib/pdf/convert"

export async function POST(req: Request) {
  try {
    const { r2Key } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json(
        { error: "缺少文件标识" },
        { status: 400 },
      )
    }

    if (!r2Key.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "仅支持 PDF 文件" },
        { status: 400 },
      )
    }

    const result = await pdfConverter.convert(r2Key)

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "转换处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
