import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const user = session.user as { id: string; email: string; name?: string; plan?: string }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        欢迎回来，{user.name || user.email}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Plan Card */}
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">当前套餐</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-bold">
              {user.plan === "PRO" ? "Pro" : "Free"}
            </span>
            {user.plan !== "PRO" && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                免费
              </span>
            )}
          </div>
          <div className="mt-4">
            {user.plan === "PRO" ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  不限处理次数
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  文件 ≤ 100MB
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  所有功能无限制
                </div>
              </div>
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
            <div>
              <div className="flex justify-between text-sm">
                <span>今日已用</span>
                <span className="font-medium">—/3 次</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-0 rounded-full bg-primary transition-all" />
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">累计处理：</span>
              <span className="font-medium">— 次</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
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
