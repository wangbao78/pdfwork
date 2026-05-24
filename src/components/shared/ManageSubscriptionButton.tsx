"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "操作失败")
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败，请稍后重试")
      setLoading(false)
    }
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={handleClick} disabled={loading}>
        {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        管理订阅
      </Button>
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
