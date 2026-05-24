import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress"
import { Check, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import {
  FREE_DAILY,
  FREE_MAX_SIZE,
  FREE_MAX_PAGES,
  PRO_MAX_SIZE,
  PRO_MAX_PAGES,
} from "@/lib/access"

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatMB(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const user = session.user as { id: string; email: string; name?: string; plan?: string }
  const plan = (user.plan as "FREE" | "PRO") || "FREE"
  const isPro = plan === "PRO"

  let dailyUsage: number | null = null
  let totalUsage: number | null = null

  try {
    const dbUser = await db.user.findUnique({ where: { id: user.id } })
    if (dbUser) {
      const isNewDay =
        !dbUser.lastUsageDate ||
        dbUser.lastUsageDate.toISOString().slice(0, 10) !== today()
      dailyUsage = isNewDay ? 0 : dbUser.dailyUsage
      totalUsage = dbUser.totalUsage
    }
  } catch {
    // DB 不可用，保留 null 显示 --
  }

  const isFull = !isPro && dailyUsage !== null && dailyUsage >= FREE_DAILY
  const usagePercent =
    dailyUsage !== null && !isPro
      ? Math.min(Math.round((dailyUsage / FREE_DAILY) * 100), 100)
      : 0

  const fmt = (n: number | null) => (n !== null ? n.toLocaleString() : "--")

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
      <p className="mt-1 text-muted-foreground">
        欢迎回来，{user.name || user.email}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Plan Card */}
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">当前套餐</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-bold">{isPro ? "Pro" : "Free"}</span>
            {!isPro && (
              <Badge variant="secondary">免费</Badge>
            )}
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            {isPro ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  不限处理次数
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  文件 ≤ {formatMB(PRO_MAX_SIZE)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  每页 ≤ {PRO_MAX_PAGES} 页
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  全部 18 个工具
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  每日 {FREE_DAILY} 次处理
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  文件 ≤ {formatMB(FREE_MAX_SIZE)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  每页 ≤ {FREE_MAX_PAGES} 页
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Pro 工具每日试用 1 次
                </div>
              </>
            )}
          </div>
          <div className="mt-4">
            {isPro ? (
              <Button size="sm" variant="outline" disabled>
                管理订阅
              </Button>
            ) : (
              <Link href="/pricing">
                <Button size="sm">
                  升级 Pro
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Usage Card */}
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">使用统计</div>
          <div className="mt-4 space-y-4">
            {/* 今日用量 */}
            <div>
              <div className="flex justify-between text-sm">
                <span>{isPro ? "今日已处理" : "今日已用"}</span>
                <span className="font-medium">
                  {isPro
                    ? `${fmt(dailyUsage)} 次`
                    : `${fmt(dailyUsage)}/${FREE_DAILY} 次`}
                  {isFull && (
                    <span className="ml-1 text-red-500">已达上限</span>
                  )}
                </span>
              </div>
              {!isPro && (
                <div className="mt-1.5">
                  <Progress value={usagePercent}>
                    <ProgressTrack>
                      <ProgressIndicator
                        className={
                          isFull ? "bg-red-500" : undefined
                        }
                      />
                    </ProgressTrack>
                  </Progress>
                </div>
              )}
              {isPro && (
                <div className="mt-1">
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    不限次
                  </Badge>
                </div>
              )}
            </div>

            {/* 累计 */}
            <div className="text-sm">
              <span className="text-muted-foreground">累计处理：</span>
              <span className="font-medium">{fmt(totalUsage)} 次</span>
            </div>

            {/* 限额信息 */}
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">单文件上限</span>
                <span className="font-medium">
                  {formatMB(isPro ? PRO_MAX_SIZE : FREE_MAX_SIZE)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">单文件页数</span>
                <span className="font-medium">
                  {isPro ? PRO_MAX_PAGES : FREE_MAX_PAGES} 页
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 快捷工具 */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">快捷工具</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { href: "/tools/pdf-to-word", label: "PDF 转 Word" },
            { href: "/tools/merge-pdf", label: "合并 PDF" },
            { href: "/tools/compress-pdf", label: "压缩 PDF" },
          ].map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              {tool.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
