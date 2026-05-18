"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Page error:", error)
  }, [error])

  return (
    <div className="mx-auto w-full max-w-md px-4 py-32 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
      <h2 className="mt-4 text-lg font-semibold">出错了</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "页面加载失败，请稍后重试"}
      </p>
      <Button onClick={reset} className="mt-6">
        重试
      </Button>
    </div>
  )
}
