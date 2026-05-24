import { NextResponse } from "next/server"
import { protectPdf, unlockPdf } from "@/lib/pdf/protect"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"
import { updateFileStatus } from "@/lib/file-status"

export async function POST(req: Request) {
  const block = await requirePro(req)
  if (block) return block
  cleanupOld()
  let rk = ""
  try {
    const { r2Key, password, action } = await req.json()
    rk = r2Key

    if (!rk || !password || typeof password !== "string") {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 })
    }
    if (password.length < 2 || password.length > 32) {
      return NextResponse.json({ error: "密码长度 2-32 位" }, { status: 400 })
    }

    const user = await getAccessUser()

    if (action === "unlock") {
      try {
        await updateFileStatus(rk, "PROCESSING", "解锁 PDF")
        const result = await unlockPdf(rk, password)
        trackUsage(user)
        await updateFileStatus(rk, "DONE")
        return NextResponse.json(result)
      } catch {
        await updateFileStatus(rk, "ERROR")
        return NextResponse.json({ error: "密码错误或文件未加密" }, { status: 400 })
      }
    }

    await updateFileStatus(rk, "PROCESSING", "加密 PDF")
    const result = await protectPdf(rk, password)
    trackUsage(user)
    await updateFileStatus(rk, "DONE")
    return NextResponse.json(result)
  } catch (e) {
    if (rk) await updateFileStatus(rk, "ERROR")
    const message = e instanceof Error ? e.message : "处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
