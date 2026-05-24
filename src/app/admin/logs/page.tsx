import { db } from "@/lib/db"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DONE: { label: "完成", variant: "default" },
  PROCESSING: { label: "处理中", variant: "secondary" },
  ERROR: { label: "失败", variant: "destructive" },
  PENDING: { label: "等待中", variant: "outline" },
}

const STATUS_FILTERS = [
  { label: "全部", value: "" },
  { label: "完成", value: "DONE" },
  { label: "处理中", value: "PROCESSING" },
  { label: "失败", value: "ERROR" },
  { label: "等待中", value: "PENDING" },
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1") || 1)
  const status = sp.status || ""
  const q = sp.q || ""

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (status) where.status = status as "DONE" | "PROCESSING" | "ERROR" | "PENDING"
  if (q) where.name = { contains: q }

  const [files, total, statusCounts] = await Promise.all([
    db.file.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      where,
    }),
    db.file.count({ where }),
    Promise.all(
      STATUS_FILTERS.filter((s) => s.value).map(async (s) => ({
        value: s.value,
        count: await db.file.count({ where: { status: s.value as "DONE" | "PROCESSING" | "ERROR" | "PENDING" } }),
      })),
    ),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // 加载用户信息（用于显示邮箱）
  const userIds = [...new Set(files.filter((f) => f.userId).map((f) => f.userId!))]
  const userMap = new Map<string, string>()
  if (userIds.length > 0) {
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    })
    for (const u of users) userMap.set(u.id, u.email)
  }

  const countMap = new Map(statusCounts.map((s) => [s.value, s.count]))

  function link(pageNum: number) {
    const params = new URLSearchParams()
    params.set("page", String(pageNum))
    if (status) params.set("status", status)
    if (q) params.set("q", q)
    return `/admin/logs?${params.toString()}`
  }

  function filterLink(st: string) {
    const params = new URLSearchParams()
    if (st) params.set("status", st)
    if (q) params.set("q", q)
    return `/admin/logs?${params.toString()}`
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">操作日志</h1>
        <span className="text-sm text-muted-foreground">共 {total} 条</span>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link key={s.value} href={filterLink(s.value)}>
            <Button
              variant={status === s.value ? "default" : "outline"}
              size="sm"
            >
              {s.label}
              {s.value && (
                <span className="ml-1 text-xs opacity-60">
                  {countMap.get(s.value) || 0}
                </span>
              )}
            </Button>
          </Link>
        ))}
        <form className="ml-auto flex gap-2" action="/admin/logs" method="GET">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="搜索文件名..."
            className="h-8 rounded-md border bg-background px-3 text-sm w-40"
          />
          <Button type="submit" size="sm" variant="outline">
            搜索
          </Button>
        </form>
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">文件名</th>
                <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                  大小
                </th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                  用户
                </th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">
                  时间
                </th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const st = STATUS_MAP[f.status] || STATUS_MAP.PENDING
                const userLabel = f.userId
                  ? userMap.get(f.userId) || "-"
                  : "游客"
                return (
                  <tr
                    key={f.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium max-w-[260px] truncate">
                      {f.name}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                      {formatSize(f.size)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[180px] truncate">
                      {userLabel}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden lg:table-cell">
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
                <Link href={link(page - 1)}>
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
                <Link href={link(page + 1)}>
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
