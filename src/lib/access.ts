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

// JSON 文件回退路径
const COUNTER_PATH = join(process.cwd(), ".data", "guest_counters.json")
const TRIAL_PATH = join(process.cwd(), ".data", "pro_trials.json")
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

/** 检查 Pro 工具试用权限。游客/Free 每日每工具 1 次试用，返回 null 通过 */
export async function checkProTool(
  user: AccessUser,
  tool: string,
  ip: string,
): Promise<string | null> {
  if (!QUOTA_ENABLED) return null
  if (user.plan === "PRO") return null

  const key = user.isGuest ? `guest:${ip}` : user.id!
  const td = today()

  // Try DB first
  try {
    const record = await db.proTrial.findUnique({
      where: { key_date_tool: { key, date: td, tool } },
    })
    if (record && record.count >= 1) {
      return user.isGuest
        ? "今日试用次数已用完，请登录后升级 Pro"
        : "今日试用次数已用完，请升级 Pro 无限使用"
    }
    if (record) {
      await db.proTrial.update({ where: { id: record.id }, data: { count: record.count + 1 } })
    } else {
      await db.proTrial.create({ data: { key, date: td, tool, count: 1 } })
    }
    return null
  } catch {
    // DB 不可用，回退到 JSON 文件
  }

  let trials: Record<string, Record<string, number>> = {}
  try {
    const raw = await readFile(TRIAL_PATH, "utf-8")
    trials = JSON.parse(raw)
  } catch {}

  const userTrials = trials[`${key}:${td}`] || {}

  if ((userTrials[tool] || 0) >= 1) {
    return user.isGuest
      ? "今日试用次数已用完，请登录后升级 Pro"
      : "今日试用次数已用完，请升级 Pro 无限使用"
  }

  userTrials[tool] = (userTrials[tool] || 0) + 1
  trials[`${key}:${td}`] = userTrials
  await mkdir(join(TRIAL_PATH, ".."), { recursive: true })
  await writeFile(TRIAL_PATH, JSON.stringify(trials), "utf-8")

  return null
}

/** 检查配额（次数、页数、文件大小） */
export async function checkQuota(
  user: AccessUser,
  fileSize: number,
  pageCount: number,
): Promise<string | null> {
  if (!QUOTA_ENABLED) return null
  if (user.plan === "PRO") return null

  // 游客按 IP（配额检查在 checkGuestQuota 中完成，这里只做文件大小和页数）
  if (user.isGuest) {
    if (fileSize > FREE_MAX_SIZE) {
      return `文件大小超过 10MB 限制，登录后可提升至 100MB`
    }
    if (pageCount > GUEST_MAX_PAGES) {
      return `文件页数超过 ${GUEST_MAX_PAGES} 页限制，登录后可提升至 ${FREE_MAX_PAGES} 页`
    }
    return null
  }

  // 登录 Free 用户
  if (fileSize > FREE_MAX_SIZE) {
    return `文件大小超过 10MB 限制，升级 Pro 可处理 100MB`
  }
  if (pageCount > FREE_MAX_PAGES) {
    return `文件页数超过 ${FREE_MAX_PAGES} 页限制，升级 Pro 可处理 ${PRO_MAX_PAGES} 页`
  }

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

/** 游客 IP 次数检查（DB 优先，JSON 兜底） */
export async function checkGuestQuota(ip: string): Promise<string | null> {
  if (!QUOTA_ENABLED) return null

  const td = today()

  // Try DB first
  try {
    let record = await db.guestUsage.findUnique({
      where: { ip_date: { ip, date: td } },
    })
    if (!record) {
      await db.guestUsage.create({ data: { ip, date: td, count: 1 } })
      return null
    }
    await db.guestUsage.update({ where: { id: record.id }, data: { count: record.count + 1 } })
    if (record.count >= GUEST_DAILY) {
      return `今日免费次数已用完（${GUEST_DAILY} 次），请登录后继续使用`
    }
    return null
  } catch {
    // DB 不可用，回退到 JSON 文件
  }

  let counters: Record<string, { count: number; date: string }> = {}
  try {
    const raw = await readFile(COUNTER_PATH, "utf-8")
    counters = JSON.parse(raw)
  } catch {}

  const key = `guest:${ip}`
  const record = counters[key]

  if (!record || record.date !== td) {
    counters[key] = { count: 1, date: td }
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

/** API 路由中快速校验 Pro 试用权限，返回 null 通过 */
export async function requirePro(req: Request): Promise<Response | null> {
  const user = await getAccessUser()
  const url = new URL(req.url)
  const tool = url.pathname.split("/api/")[1]?.replace(/-/g, "_") || ""
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  const err = await checkProTool(user, tool, ip)
  if (err) return Response.json({ error: err, trial: true }, { status: 403 })
  return null
}

export {
  PRO_TOOLS,
  FREE_MAX_SIZE,
  GUEST_DAILY,
  FREE_DAILY,
  GUEST_MAX_PAGES,
  FREE_MAX_PAGES,
  PRO_MAX_PAGES,
  PRO_MAX_SIZE,
}
