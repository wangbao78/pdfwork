"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Lock, LogIn, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  tool: string
}

export function UpgradePrompt({ tool }: Props) {
  const { data: session } = useSession()

  if (session?.user) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Pro 功能</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            「{tool}」为 Pro 专享功能，升级后即可使用全部 18 个工具。
          </p>
        </div>
        <Link href="/pricing">
          <Button>
            升级 Pro <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-8 text-center space-y-4">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <LogIn className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">请先登录</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          登录后即可使用「{tool}」。Pro 用户可解锁全部 18 个工具。
        </p>
      </div>
      <Link href="/auth/login">
        <Button variant="default">登录</Button>
      </Link>
      <span className="text-xs text-muted-foreground block">
        还没有账号？<Link href="/auth/register" className="text-primary hover:underline">注册</Link>
      </span>
    </div>
  )
}

/** Hook: 检查是否有 Pro 权限 */
export function useCanUsePro() {
  const { data: session } = useSession()
  if (!session?.user) return { canUse: false, reason: "guest" as const }
  const plan = (session.user as any).plan
  if (plan === "PRO") return { canUse: true, reason: null }
  return { canUse: false, reason: "free" as const }
}
