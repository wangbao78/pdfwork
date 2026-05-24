import bcrypt from "bcryptjs"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

const DATA_DIR = join(process.cwd(), ".data")
const JSON_PATH = join(DATA_DIR, "users.json")

export interface UserRecord {
  id: string
  email: string
  name: string | null
  password: string
  createdAt: Date
}

// JSON file fallback (兼容旧对象格式)
async function readUsers(): Promise<UserRecord[]> {
  try {
    const raw = await readFile(JSON_PATH, "utf-8")
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data
    // 旧格式: { "email": {...} }
    return Object.values(data) as UserRecord[]
  } catch {
    return []
  }
}

async function writeUsers(users: UserRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(JSON_PATH, JSON.stringify(users, null, 2), "utf-8")
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  // Try DB first
  try {
    const { db } = await import("@/lib/db")
    const user = await db.user.findUnique({ where: { email } })
    if (user?.password) {
      return { id: user.id, email: user.email, name: user.name, password: user.password, createdAt: user.createdAt }
    }
  } catch {
    // DB not available, fall through to JSON
  }

  // JSON file fallback
  const users = await readUsers()
  return users.find((u) => u.email === email) || null
}

export async function createUser(email: string, name: string, password: string): Promise<UserRecord> {
  const hashed = await bcrypt.hash(password, 10)

  // Try DB first
  try {
    const { db } = await import("@/lib/db")
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) throw new Error("该邮箱已注册")

    const user = await db.user.create({
      data: { email, name, password: hashed },
    })
    return { id: user.id, email: user.email, name: user.name, password: user.password!, createdAt: user.createdAt }
  } catch (e: any) {
    if (e.message === "该邮箱已注册") throw e
    // DB not available, fall through to JSON
  }

  // JSON file fallback
  const users = await readUsers()
  if (users.find((u) => u.email === email)) throw new Error("该邮箱已注册")

  const newUser: UserRecord = {
    id: `local_${Date.now().toString(36)}`,
    email,
    name,
    password: hashed,
    createdAt: new Date(),
  }
  users.push(newUser)
  await writeUsers(users)
  return newUser
}
