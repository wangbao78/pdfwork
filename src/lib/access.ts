import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"

const QUOTA_ENABLED = process.env.ENABLE_QUOTA === "true"

// Pro 专享工具列表
const PRO_TOOLS = [
  "office-to-pdf",
  "html-to-pdf",
  "protect",
  "watermark-image",
  "batch",
  "ocr",
  "compress-extreme",
] as const

// 限额配置
const GUEST_DAILY = 3
const FREE_DAILY = 5
const GUEST_MAX_PAGES = 20
const FREE_MAX_PAGES = 30
const PRO_MAX_PAGES = 200
const FREE_MAX_SIZE = 10 * 1024 * 1024  // 10MB
const PRO_MAX_SIZE = 100 * 1024 * 1024  // 100MB

// 文件计数器
const COUNTER_PATH = join(process.cwd(), ".data", "guest_counters.json")
const USER_COUNTER_PATH = join(process.cwd(), ".data", "user_counters.json")

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface AccessUser {
  id?: string
  email?: string
  plan: "FREE" | "PRO"
  isGuest: boolean
}

export async function getAccessUser(): Promise<AccessUser> {
  try {
    const session = await auth()
    if (session?.user) {
      const user = session.user as { id: string; plan?: string }
      return {
        id: user.id,
        plan: (user.plan as "FREE" | "PRO") || "FREE",
        isGuest: false,
      }
    }
  } catch {}
  return { plan: "FREE", isGuest: true }
}

/** 检查是否有权使用 Pro 工具，返回 null 表示通过，返回字符串为错误信息 */
export function checkProTool(
  user: AccessUser,
  _tool: string,
): string | null {
  if (!QUOTA_ENABLED) return null
  if (user.isGuest) return "请先登录后使用此功能"
  if (user.plan === "FREE") return "此功能为 Pro 专享，请升级后使用"
  return null
}

/** 检查配额（次数、页数、文件大小） */
export async function checkQuota(
  user: AccessUser,
  fileSize: number,
  pageCount: number,
): Promise<string | null> {
  if (!QUOTA_ENABLED) return null
  // Pro 不限
  if (user.plan === "PRO") return null

  // 游客按 IP
  if (user.isGuest) {
    // 大小检查
    if (fileSize > FREE_MAX_SIZE) {
      return `文件大小超过 10MB 限制，登录后可提升至 100MB`
    }
    if (pageCount > GUEST_MAX_PAGES) {
      return `文件页数超过 ${GUEST_MAX_PAGES} 页限制，登录后可提升至 ${FREE_MAX_PAGES} 页`
    }
    // 次数检查（需要从请求上下文拿 IP，这里返回 null 在 API 层再查）
    return null
  }

  // 登录 Free 用户
  if (fileSize > FREE_MAX_SIZE) {
    return `文件大小超过 10MB 限制，升级 Pro 可处理 100MB`
  }
  if (pageCount > FREE_MAX_PAGES) {
    return `文件页数超过 ${FREE_MAX_PAGES} 页限制，升级 Pro 可处理 ${PRO_MAX_PAGES} 页`
  }

  // 检查每日次数
  try {
    const dbUser = await db.user.findUnique({ where: { id: user.id! } })
    if (!dbUser) return null

    const isNewDay = !dbUser.lastUsageDate || new Date(dbUser.lastUsageDate).toISOString().slice(0, 10) !== today()
    const dailyUsage = isNewDay ? 0 : dbUser.dailyUsage

    if (dailyUsage >= FREE_DAILY) {
      return `今日已使用 ${FREE_DAILY} 次，升级 Pro 不限次数`
    }
  } catch {
    // DB 不可用，回退到文件计数器
    const userId = user.id!
    let counters: Record<string, { count: number; date: string }> = {}
    try {
      const raw = await readFile(USER_COUNTER_PATH, "utf-8")
      counters = JSON.parse(raw)
    } catch {}
    const record = counters[userId]
    if (record && record.date === today() && record.count >= FREE_DAILY) {
      return `今日已使用 ${FREE_DAILY} 次，升级 Pro 不限次数`
    }
  }

  return null
}

/** 记录一次使用 */
export async function trackUsage(user: AccessUser): Promise<void> {
  if (!QUOTA_ENABLED || user.isGuest || !user.id) return

  try {
    const now = new Date()
    const dbUser = await db.user.findUnique({ where: { id: user.id } })
    if (!dbUser) return

    const isNewDay = !dbUser.lastUsageDate || new Date(dbUser.lastUsageDate).toISOString().slice(0, 10) !== today()

    await db.user.update({
      where: { id: user.id },
      data: {
        dailyUsage: isNewDay ? 1 : dbUser.dailyUsage + 1,
        totalUsage: dbUser.totalUsage + 1,
        lastUsageDate: now,
      },
    })
  } catch {
    // DB 不可用，回退到文件计数器
    const userId = user.id!
    let counters: Record<string, { count: number; date: string }> = {}
    try {
      const raw = await readFile(USER_COUNTER_PATH, "utf-8")
      counters = JSON.parse(raw)
    } catch {}
    const record = counters[userId]
    const td = today()
    counters[userId] = {
      count: (record?.date === td ? (record?.count || 0) : 0) + 1,
      date: td,
    }
    await mkdir(join(USER_COUNTER_PATH, ".."), { recursive: true })
    await writeFile(USER_COUNTER_PATH, JSON.stringify(counters), "utf-8")
  }
}

/** 游客 IP 次数检查（文件持久化，重启不丢） */
export async function checkGuestQuota(ip: string): Promise<string | null> {
  if (!QUOTA_ENABLED) return null

  // 读取计数器
  let counters: Record<string, { count: number; date: string }> = {}
  try {
    const raw = await readFile(COUNTER_PATH, "utf-8")
    counters = JSON.parse(raw)
  } catch {}

  const key = `guest:${ip}`
  const record = counters[key]

  if (!record || record.date !== today()) {
    counters[key] = { count: 1, date: today() }
    await mkdir(join(COUNTER_PATH, ".."), { recursive: true })
    await writeFile(COUNTER_PATH, JSON.stringify(counters), "utf-8")
    return null
  }

  record.count++
  counters[key] = record
  await writeFile(COUNTER_PATH, JSON.stringify(counters), "utf-8")

  if (record.count > GUEST_DAILY) {
    return `今日免费次数已用完（${GUEST_DAILY} 次），请登录后继续使用`
  }

  return null
}

/** API 路由中快速校验 Pro 权限，返回 null 通过，返回 Response 则直接返回错误 */
export async function requirePro(req: Request): Promise<Response | null> {
  const user = await getAccessUser()
  const url = new URL(req.url)
  const tool = url.pathname.split("/api/")[1] || ""
  const err = checkProTool(user, tool)
  if (err) return Response.json({ error: err }, { status: err.includes("登录") ? 401 : 403 })
  return null
}

export { PRO_TOOLS, FREE_MAX_SIZE }
