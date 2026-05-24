import { requireAdmin, type AdminUser } from "@/lib/admin"
import { BarChart3, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user: AdminUser

  try {
    user = await requireAdmin()
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">403</h1>
            <p className="mt-2 text-muted-foreground">无权访问管理端</p>
            <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
              返回首页
            </Link>
          </div>
        </div>
      )
    }
    throw e
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1.5 text-sm font-semibold">
              <BarChart3 className="h-4 w-4" />
              管理端
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                概览
              </Link>
              <Link href="/admin/users" className="text-muted-foreground hover:text-foreground transition-colors">
                用户
              </Link>
              <Link href="/admin/logs" className="text-muted-foreground hover:text-foreground transition-colors">
                日志
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{user?.name || user?.email}</span>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
