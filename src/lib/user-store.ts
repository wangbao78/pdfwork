import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export interface UserRecord {
  id: string
  email: string
  name: string | null
  password: string
  createdAt: Date
}

export async function findUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.password) return null
  return { id: user.id, email: user.email, name: user.name, password: user.password, createdAt: user.createdAt }
}

export async function createUser(
  email: string,
  name: string,
  password: string,
): Promise<UserRecord> {
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) throw new Error("该邮箱已注册")

  const hashed = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: { email, name, password: hashed },
  })

  return { id: user.id, email: user.email, name: user.name, password: user.password!, createdAt: user.createdAt }
}
