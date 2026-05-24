import { db } from "@/lib/db"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, FileText, Activity, Globe } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default async function AdminPage() {
  const td = todayStr()
  const ts = todayStart()

  const [
    totalUsers,
    todayUsers,
    freeUsers,
    proUsers,
    totalFiles,
    todayFiles,
    guestToday,
    recentUsers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: ts } } }),
    db.user.count({ where: { plan: "FREE" } }),
    db.user.count({ where: { plan: "PRO" } }),
    db.file.count(),
    db.file.count({ where: { createdAt: { gte: ts } } }),
    db.guestUsage
      .aggregate({ where: { date: td }, _sum: { count: true } })
      .then((r) => r._sum.count || 0)
      .catch(() => 0),
    db.user.findMany({
      select: { email: true, plan: true, createdAt: true, totalUsage: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ])

  const stats = [
    { label: "总用户", value: totalUsers, icon: Users },
    { label: "今日注册", value: todayUsers, icon: UserPlus },
    { label: "Free / Pro", value: `${freeUsers} / ${proUsers}`, icon: Users },
    { label: "总文件", value: totalFiles, icon: FileText },
    { label: "今日文件", value: todayFiles, icon: Activity },
    { label: "游客使用", value: guestToday, icon: Globe },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold">概览</h1>

      {/* Stats grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent users */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">最近注册</h2>
          <Link
            href="/admin/users"
            className="text-sm text-primary hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">邮箱</th>
                <th className="px-4 py-3 text-left font-medium">套餐</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                  注册时间
                </th>
                <th className="px-4 py-3 text-right font-medium">使用次数</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.email} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={u.plan === "PRO" ? "default" : "secondary"}
                    >
                      {u.plan}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {u.createdAt.toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">{u.totalUsage}</td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    暂无用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
