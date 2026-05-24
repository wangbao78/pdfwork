import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  const currentUser = session.user as { email?: string }
  if (!adminEmail || currentUser.email !== adminEmail) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 })
  }

  try {
    await db.file.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
