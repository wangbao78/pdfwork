import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import bcrypt from "bcryptjs"

const DATA_DIR = join(process.cwd(), ".data")
const USERS_FILE = join(DATA_DIR, "users.json")

interface StoredUser {
  id: string
  email: string
  name: string
  password: string
  createdAt: string
}

// In-memory cache
let cache: Record<string, StoredUser> | null = null

async function load(): Promise<Record<string, StoredUser>> {
  if (cache) return cache
  if (!existsSync(USERS_FILE)) {
    cache = {}
    return cache
  }
  const raw = await readFile(USERS_FILE, "utf-8")
  cache = JSON.parse(raw)
  return cache!
}

async function save(users: Record<string, StoredUser>): Promise<void> {
  cache = users
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2))
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  const users = await load()
  return users[email] || null
}

export async function createUser(
  email: string,
  name: string,
  password: string,
): Promise<StoredUser> {
  const users = await load()
  if (users[email]) throw new Error("该邮箱已注册")

  const hashed = await bcrypt.hash(password, 10)
  const user: StoredUser = {
    id: `u_${Date.now().toString(36)}`,
    email,
    name,
    password: hashed,
    createdAt: new Date().toISOString(),
  }

  users[email] = user
  await save(users)
  return user
}
