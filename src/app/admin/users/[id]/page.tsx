import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { UserActions } from "@/components/admin/UserActions"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 15

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DONE: { label: "完成", variant: "default" },
  PROCESSING: { label: "处理中", variant: "secondary" },
  ERROR: { label: "失败", variant: "destructive" },
  PENDING: { label: "等待中", variant: "outline" },
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1") || 1)

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      createdAt: true,
      dailyUsage: true,
      totalUsage: true,
      lastUsageDate: true,
    },
  })
  if (!user) notFound()

  const [files, totalFiles] = await Promise.all([
    db.file.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.file.count({ where: { userId: id } }),
  ])

  const totalPages = Math.ceil(totalFiles / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">用户详情</h1>
      </div>

      {/* Info Card */}
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm text-muted-foreground">邮箱</div>
            <div className="mt-1 font-medium">{user.email}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">名称</div>
            <div className="mt-1 font-medium">{user.name || "-"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">套餐</div>
            <div className="mt-1">
              <Badge variant={user.plan === "PRO" ? "default" : "secondary"}>
                {user.plan}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">注册时间</div>
            <div className="mt-1 font-medium">
              {user.createdAt.toLocaleString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">今日使用</div>
            <div className="mt-1 font-medium">{user.dailyUsage} 次</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">累计使用</div>
            <div className="mt-1 font-medium">{user.totalUsage} 次</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">最后使用</div>
            <div className="mt-1 font-medium">
              {user.lastUsageDate
                ? user.lastUsageDate.toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <UserActions userId={user.id} plan={user.plan} />
        </div>
      </Card>

      {/* Files */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">
          操作记录
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            共 {totalFiles} 条
          </span>
        </h2>
        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">文件名</th>
                  <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                    类型
                  </th>
                  <th className="px-4 py-3 text-right font-medium">大小</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium hidden md:table-cell">
                    时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const st = STATUS_MAP[f.status] || STATUS_MAP.PENDING
                  return (
                    <tr
                      key={f.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">
                        {f.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {f.type || "-"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatSize(f.size)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">
                        {f.createdAt.toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  )
                })}
                {files.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      暂无记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={`/admin/users/${id}?page=${page - 1}`}>
                    <Button variant="outline" size="sm">
                      上一页
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    上一页
                  </Button>
                )}
                {page < totalPages ? (
                  <Link href={`/admin/users/${id}?page=${page + 1}`}>
                    <Button variant="outline" size="sm">
                      下一页
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    下一页
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
