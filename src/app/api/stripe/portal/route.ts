import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createPortalSession } from "@/lib/stripe"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "未找到订阅信息，请联系客服" },
        { status: 400 },
      )
    }

    const returnUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard`
    const url = await createPortalSession(user.stripeCustomerId, returnUrl)
    if (!url) {
      return NextResponse.json(
        { error: "支付服务暂未配置" },
        { status: 500 },
      )
    }

    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ error: "操作失败，请稍后重试" }, { status: 500 })
  }
}
