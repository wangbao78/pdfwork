import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createCheckoutSession } from "@/lib/stripe"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const url = await createCheckoutSession(session.user.id, session.user.email)
    if (!url) {
      return NextResponse.json(
        { error: "支付服务暂未配置" },
        { status: 500 },
      )
    }

    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: "创建支付会话失败" }, { status: 500 })
  }
}
