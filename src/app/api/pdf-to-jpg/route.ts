import { NextResponse } from "next/server"
import { pdfToJpg } from "@/lib/pdf/pdf-to-jpg"
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

    await updateFileStatus(rk, "PROCESSING")
    const images = await pdfToJpg(rk)

    await updateFileStatus(rk, "DONE")
    return NextResponse.json({ images })
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "转换失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
