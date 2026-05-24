import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  const currentUser = session.user as { email?: string }
  if (!adminEmail || currentUser.email !== adminEmail) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  const { id } = await params
  const { action } = await req.json()

  try {
    switch (action) {
      case "upgrade":
        await db.user.update({ where: { id }, data: { plan: "PRO" } })
        break
      case "downgrade":
        await db.user.update({ where: { id }, data: { plan: "FREE" } })
        break
      case "reset_usage":
        await db.user.update({
          where: { id },
          data: { dailyUsage: 0, lastUsageDate: new Date() },
        })
        break
      default:
        return NextResponse.json({ error: "无效操作" }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}
