import { db } from "./db"

export interface QuotaCheck {
  allowed: boolean
  reason?: string
}

const FREE_DAILY = 3
const FREE_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const FREE_MAX_PAGES = 50

const PRO_MAX_SIZE = 100 * 1024 * 1024 // 100MB
const PRO_MAX_PAGES = 200

export async function checkQuota(
  userId: string | undefined,
  fileSize: number,
  pageCount?: number,
): Promise<QuotaCheck> {
  // No user — use default limits
  if (!userId) {
    if (fileSize > FREE_MAX_SIZE) {
      return { allowed: false, reason: "文件大小超过 5MB 限制" }
    }
    return { allowed: true }
  }

  try {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { allowed: false, reason: "用户不存在" }
    }

    const isPro = user.plan === "PRO"
    const maxSize = isPro ? PRO_MAX_SIZE : FREE_MAX_SIZE
    const maxPages = isPro ? PRO_MAX_PAGES : FREE_MAX_PAGES

    // Check size
    if (fileSize > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024))
      return {
        allowed: false,
        reason: `文件大小超过 ${maxMB}MB 限制${isPro ? "" : "，升级 Pro 可处理 100MB 文件"}`,
      }
    }

    // Check page count
    if (pageCount && pageCount > maxPages) {
      return {
        allowed: false,
        reason: `文件页数超过 ${maxPages} 页限制${isPro ? "" : "，升级 Pro 可处理 200 页"}`,
      }
    }

    // Check daily usage for Free users
    if (!isPro) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayDate =
        user.lastUsageDate && new Date(user.lastUsageDate) >= today

      if (todayDate && user.dailyUsage >= FREE_DAILY) {
        return {
          allowed: false,
          reason: `今日已使用 ${FREE_DAILY} 次，升级 Pro 不限次数`,
        }
      }
    }

    return { allowed: true }
  } catch {
    // DB not available — allow
    return { allowed: true }
  }
}

export async function incrementUsage(userId: string): Promise<void> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return

    const isNewDay = !user.lastUsageDate || new Date(user.lastUsageDate) < today

    await db.user.update({
      where: { id: userId },
      data: {
        dailyUsage: isNewDay ? 1 : user.dailyUsage + 1,
        totalUsage: user.totalUsage + 1,
        lastUsageDate: new Date(),
      },
    })
  } catch {
    // DB not available — skip
  }
}
