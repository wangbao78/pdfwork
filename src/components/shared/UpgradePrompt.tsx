"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Lock, LogIn, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  tool: string
  reason?: "guest" | "free" | "trial_used"
}

export function UpgradePrompt({ tool, reason }: Props) {
  const { data: session } = useSession()

  if (reason === "trial_used" && session?.user) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">今日试用次数已用完</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            「{tool}」为 Pro 专享功能，升级后不限使用。
          </p>
        </div>
        <Link href="/pricing">
          <Button size="sm">
            升级 Pro <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    )
  }

  if (reason === "trial_used") {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <LogIn className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold">今日试用次数已用完</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            请登录后升级 Pro 继续使用。
          </p>
        </div>
        <Link href="/auth/login"><Button size="sm">登录</Button></Link>
      </div>
    )
  }

  return null
}
