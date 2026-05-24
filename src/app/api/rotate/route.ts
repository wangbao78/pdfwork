import { NextResponse } from "next/server"
import { rotatePdf, type Rotation } from "@/lib/pdf/rotate"
import { cleanupOld } from "@/lib/cleanup"
import { updateFileStatus } from "@/lib/file-status"

export async function POST(req: Request) {
  cleanupOld()
  let rk = ""
  try {
    const { r2Key, rotation } = await req.json()
    rk = r2Key

    if (!rk || typeof rk !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    const valid: Rotation[] = [90, 180, 270]
    const rot: Rotation = valid.includes(rotation) ? rotation : 90

    await updateFileStatus(rk, "PROCESSING")
    const result = await rotatePdf(rk, rot)

    await updateFileStatus(rk, "DONE")
    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "旋转失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
