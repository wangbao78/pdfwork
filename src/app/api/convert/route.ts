import { NextResponse } from "next/server"
import { pdfConverter } from "@/lib/pdf/convert"
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

    await updateFileStatus(rk, "PROCESSING")
    const result = await pdfConverter.convert(rk)

    await updateFileStatus(rk, "DONE")
    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "转换处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
