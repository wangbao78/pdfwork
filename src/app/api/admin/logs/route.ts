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
  const ids = url.searchParams.get("ids") || url.searchParams.get("id")
  if (!ids) {
    return NextResponse.json({ error: "缺少 ID" }, { status: 400 })
  }

  try {
    const idList = ids.split(",")
    if (idList.length === 1) {
      await db.file.delete({ where: { id: idList[0] } })
    } else {
      await db.file.deleteMany({ where: { id: { in: idList } } })
    }
    return NextResponse.json({ ok: true, count: idList.length })
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
