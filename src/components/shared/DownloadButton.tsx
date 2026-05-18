"use client"

import { useState } from "react"
import { Download, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  url?: string
  filename?: string
  label?: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  disabled?: boolean
  className?: string
}

export function DownloadButton({
  url,
  filename = "download",
  label = "下载结果",
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  className,
}: Props) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!url || downloading) return
    setDownloading(true)
    try {
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setDownloading(false)
    }
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <p className="text-sm text-destructive">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            重试
          </Button>
        )}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <Button disabled className={cn("min-w-[160px]", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        处理中...
      </Button>
    )
  }

  // Normal state
  return (
    <Button
      onClick={handleDownload}
      disabled={!url || disabled || downloading}
      className={cn("min-w-[160px]", className)}
    >
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          下载中...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}
