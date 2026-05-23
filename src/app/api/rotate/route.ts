import { NextResponse } from "next/server"
import { rotatePdf, type Rotation } from "@/lib/pdf/rotate"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { r2Key, rotation } = await req.json()

    if (!r2Key || typeof r2Key !== "string") {
      return NextResponse.json({ error: "缺少文件标识" }, { status: 400 })
    }

    const valid: Rotation[] = [90, 180, 270]
    const rot: Rotation = valid.includes(rotation) ? rotation : 90

    const result = await rotatePdf(r2Key, rot)

    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "旋转失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
