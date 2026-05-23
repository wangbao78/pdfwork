import { NextResponse } from "next/server"
import { protectPdf, unlockPdf } from "@/lib/pdf/protect"
import { cleanupOld } from "@/lib/cleanup"

export async function POST(req: Request) {
  cleanupOld()

  try {
    const { r2Key, password, action } = await req.json()

    if (!r2Key || !password || typeof password !== "string") {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 })
    }
    if (password.length < 2 || password.length > 32) {
      return NextResponse.json({ error: "密码长度 2-32 位" }, { status: 400 })
    }

    if (action === "unlock") {
      try {
        const result = await unlockPdf(r2Key, password)
        return NextResponse.json(result)
      } catch {
        return NextResponse.json({ error: "密码错误或文件未加密" }, { status: 400 })
      }
    }

    const result = await protectPdf(r2Key, password)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : "处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
