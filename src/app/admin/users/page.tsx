import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1") || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [users, total] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
        totalUsage: true,
        dailyUsage: true,
        lastUsageDate: true,
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    db.user.count(),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">用户列表</h1>
        <span className="text-sm text-muted-foreground">共 {total} 个用户</span>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">邮箱</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                  名称
                </th>
                <th className="px-4 py-3 text-left font-medium">套餐</th>
                <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                  今日
                </th>
                <th className="px-4 py-3 text-right font-medium">累计</th>
                <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">
                  注册时间
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-primary hover:underline"
                    >
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {u.name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={u.plan === "PRO" ? "default" : "secondary"}
                    >
                      {u.plan}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                    {u.dailyUsage}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u.totalUsage}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                    {u.createdAt.toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    暂无用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 页
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={`/admin/users?page=${page - 1}`}>
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一页
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </Button>
              )}
              {page < totalPages ? (
                <Link href={`/admin/users?page=${page + 1}`}>
                  <Button variant="outline" size="sm">
                    下一页
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
