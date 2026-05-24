import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LogsTable } from "@/components/admin/LogsTable"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { label: "全部", value: "" },
  { label: "完成", value: "DONE" },
  { label: "处理中", value: "PROCESSING" },
  { label: "失败", value: "ERROR" },
  { label: "等待中", value: "PENDING" },
]

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string; user?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1") || 1)
  const status = sp.status || ""
  const q = sp.q || ""
  const userFilter = sp.user || ""

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (status) where.status = status as "DONE" | "PROCESSING" | "ERROR" | "PENDING"
  if (q) where.name = { contains: q }

  if (userFilter) {
    const matchedUsers = await db.user.findMany({
      where: { email: { contains: userFilter } },
      select: { id: true },
    })
    const userIds = matchedUsers.map((u) => u.id)
    where.OR = [
      { userId: { in: userIds } },
      { ip: { contains: userFilter } },
    ]
  }

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

  // 加载当前页用户信息
  const pageUserIds = [...new Set(files.filter((f) => f.userId).map((f) => f.userId!))]
  const userMap = new Map<string, string>()
  if (pageUserIds.length > 0) {
    const users = await db.user.findMany({
      where: { id: { in: pageUserIds } },
      select: { id: true, email: true },
    })
    for (const u of users) userMap.set(u.id, u.email)
  }

  const countMap = new Map(statusCounts.map((s) => [s.value, s.count]))

  function makeLink(p: number) {
    const params = new URLSearchParams()
    params.set("page", String(p))
    if (status) params.set("status", status)
    if (q) params.set("q", q)
    if (userFilter) params.set("user", userFilter)
    return `/admin/logs?${params.toString()}`
  }

  function filterLink(st: string) {
    const params = new URLSearchParams()
    if (st) params.set("status", st)
    if (q) params.set("q", q)
    if (userFilter) params.set("user", userFilter)
    return `/admin/logs?${params.toString()}`
  }

  const navLinks = {
    first: page > 1 ? makeLink(1) : null,
    prev: page > 1 ? makeLink(page - 1) : null,
    next: page < totalPages ? makeLink(page + 1) : null,
    last: page < totalPages ? makeLink(totalPages) : null,
  }

  const rows = files.map((f) => {
    let userLabel = "-"
    if (f.userId) {
      userLabel = userMap.get(f.userId) || "-"
    } else if (f.ip) {
      userLabel = `游客 ${f.ip}`
    } else {
      userLabel = "游客"
    }
    return {
      id: f.id,
      name: f.name,
      size: f.size,
      status: f.status,
      tool: f.tool,
      ip: f.ip,
      userId: f.userId,
      createdAt: f.createdAt,
      userLabel,
    }
  })

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
            name="user"
            defaultValue={userFilter}
            placeholder="用户邮箱或IP..."
            className="h-8 rounded-md border bg-background px-3 text-sm w-36"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="搜索文件名..."
            className="h-8 rounded-md border bg-background px-3 text-sm w-36"
          />
          <Button type="submit" size="sm" variant="outline">
            搜索
          </Button>
        </form>
      </div>

      <LogsTable
        files={rows}
        total={total}
        page={page}
        totalPages={totalPages}
        navLinks={navLinks}
      />
    </div>
  )
}
