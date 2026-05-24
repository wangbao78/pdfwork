"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"

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

interface FileRow {
  id: string
  name: string
  size: number
  status: string
  tool: string | null
  ip: string | null
  userId: string | null
  createdAt: Date
  userLabel: string
}

interface NavLinks {
  first: string | null
  prev: string | null
  next: string | null
  last: string | null
}

interface Props {
  files: FileRow[]
  total: number
  page: number
  totalPages: number
  navLinks: NavLinks
}

export function LogsTable({ files, total, page, totalPages, navLinks }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const allSelected = files.length > 0 && files.every((f) => selected.has(f.id))
  const someSelected = selected.size > 0

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(files.map((f) => f.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`确定删除选中的 ${selected.size} 条记录？`)) return
    setDeleting(true)
    try {
      const ids = Array.from(selected).join(",")
      const res = await fetch(`/api/admin/logs?ids=${ids}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "删除失败")
        return
      }
      setSelected(new Set())
      router.refresh()
    } catch {
      alert("删除失败，请稍后重试")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="mt-4 overflow-hidden">
      {/* Batch actions */}
      {someSelected && (
        <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            已选 {selected.size} 条
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            删除选中
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">文件名</th>
              <th className="px-4 py-3 text-left font-medium">功能</th>
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
              return (
                <tr
                  key={f.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(f.id)}
                      onChange={() => toggle(f.id)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium max-w-[220px] truncate">
                    {f.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {f.tool || (f.status === "PENDING" ? "待处理" : "-")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                    {formatSize(f.size)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                    {f.userLabel}
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
                  colSpan={7}
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
            第 {page} / {totalPages} 页，共 {total} 条
          </span>
          <div className="flex gap-2">
            {navLinks.first ? (
              <Link href={navLinks.first}>
                <Button variant="outline" size="sm" title="首页">
                  <ChevronFirst className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronFirst className="h-4 w-4" />
              </Button>
            )}
            {navLinks.prev ? (
              <Link href={navLinks.prev}>
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
            {navLinks.next ? (
              <Link href={navLinks.next}>
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
            {navLinks.last ? (
              <Link href={navLinks.last}>
                <Button variant="outline" size="sm" title="末页">
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLast className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
