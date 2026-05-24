"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"

type CompressLevel = "standard" | "high" | "extreme"
type Step = "upload" | "uploading" | "ready" | "processing" | "done"

const LEVEL_LABELS: Record<CompressLevel, string> = {
  standard: "标准 — 平衡质量与体积",
  high: "高压缩 — 显著减小体积",
  extreme: "极限 — 最小体积（可能影响清晰度）",
}

export default function CompressPdfPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [level, setLevel] = useState<CompressLevel>("standard")
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [sizes, setSizes] = useState<{ original: number; compressed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trialUsed, setTrialUsed] = useState(false)

  const handleFile = async (f: File) => {
    setFile(f)
    setStep("uploading")
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", f)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "上传失败" }))
        throw new Error(msg || "上传失败")
      }

      const { r2Key: key } = await res.json()
      setR2Key(key)
      setStep("ready")
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败")
      setStep("upload")
    }
  }

  const handleCompress = async () => {
    if (!r2Key) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key, level }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.trial) setTrialUsed(true)
        throw new Error(data.error || "压缩失败")
      }

      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setSizes({ original: data.originalSize, compressed: data.compressedSize })
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "压缩失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    setFile(null)
    setR2Key(null)
    setDownloadUrl(null)
    setSizes(null)
    setError(null)
    setStep("upload")
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const reduction = sizes
    ? Math.round((1 - sizes.compressed / sizes.original) * 100)
    : 0

  if (trialUsed) {
    return (
      <ToolLayout title="压缩 PDF" description="减小 PDF 文件体积。提供标准、高、极限三种压缩级别。">
        <UpgradePrompt tool="极限压缩" reason="trial_used" />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout
      title="压缩 PDF"
      description="减小 PDF 文件体积。提供标准、高、极限三种压缩级别。"
    >
      {(step === "upload" || step === "uploading") && (
        <div className="space-y-4">
          <UploadZone
            onFile={handleFile}
            disabled={step === "uploading"}
            maxSize={100 * 1024 * 1024}
          />
          {step === "uploading" && file && (
            <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm">正在上传 {file.name}...</span>
            </div>
          )}
        </div>
      )}

      {(step === "ready" || step === "processing" || step === "done") && file && (
        <div className="space-y-4">
          <FileCard file={file} />

          {step === "ready" && (
            <div className="space-y-2">
              <Label>压缩级别</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as CompressLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LEVEL_LABELS) as CompressLevel[]).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LEVEL_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button onClick={handleCompress} className="min-w-[160px]">
                开始压缩
              </Button>
            )}
            {step === "processing" && (
              <Button disabled className="min-w-[160px]">
                <Loader2 className="h-4 w-4 animate-spin" />
                压缩中...
              </Button>
            )}
            {step === "done" && sizes && (
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    原大小：{formatSize(sizes.original)}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">
                    {formatSize(sizes.compressed)}
                  </span>
                  <span className="text-emerald-600 font-medium">
                    -{reduction}%
                  </span>
                </div>
                <DownloadButton
                  url={downloadUrl ?? undefined}
                  filename={file.name}
                  label="下载压缩结果"
                />
              </div>
            )}
            <Button variant="outline" onClick={handleReset}>
              重新上传
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive font-medium">{error}</p>
          {error.includes("未安装") && (
            <p className="mt-1 text-xs text-muted-foreground">
              本地开发需安装对应软件，部署到 Railway 后无需手动安装
            </p>
          )}
        </div>
      )}
    </ToolLayout>
  )
}
