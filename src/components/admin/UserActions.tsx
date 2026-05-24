"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface Props {
  userId: string
  plan: string
}

export function UserActions({ userId, plan }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (action: string) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "操作失败")
        return
      }
      router.refresh()
    } catch {
      alert("操作失败，请稍后重试")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      {plan === "FREE" ? (
        <Button
          size="sm"
          onClick={() => handleAction("upgrade")}
          disabled={loading !== null}
        >
          {loading === "upgrade" && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          升级为 Pro
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction("downgrade")}
          disabled={loading !== null}
        >
          {loading === "downgrade" && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          降级为 Free
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleAction("reset_usage")}
        disabled={loading !== null}
      >
        {loading === "reset_usage" && (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        )}
        重置今日次数
      </Button>
    </div>
  )
}
