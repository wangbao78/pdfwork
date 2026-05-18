import { NextResponse } from "next/server"
import { createUser } from "@/lib/user-store"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "请输入有效的邮箱" }, { status: 400 })
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要 6 位" },
        { status: 400 },
      )
    }

    await createUser(email, name || "", password)

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "注册失败"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
