"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, LockOpen } from "lucide-react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"
type Mode = "protect" | "unlock"

export default function ProtectPdfPage() {
  const [step, setStep] = useState<Step>("upload")
  const [mode, setMode] = useState<Mode>("protect")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trialUsed, setTrialUsed] = useState(false)

  const handleFile = async (f: File) => {
    setFile(f)
    setStep("uploading")
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", f)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
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

  const handleAction = async () => {
    if (!r2Key || !password) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/protect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key, password, action: mode }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.trial) setTrialUsed(true)
        throw new Error(data.error || "处理失败")
      }

      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "处理失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    setFile(null)
    setR2Key(null)
    setPassword("")
    setDownloadUrl(null)
    setError(null)
    setStep("upload")
  }

  if (trialUsed) {
    return (
      <ToolLayout title="PDF 加密 / 解锁" description="给 PDF 添加打开密码，或输入密码解除保护。">
        <UpgradePrompt tool="PDF 加密 / 解锁" reason="trial_used" />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout
      title="PDF 加密 / 解锁"
      description="给 PDF 添加打开密码，或输入密码解除保护。"
    >
      {(step === "upload" || step === "uploading") && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1">
            <button
              onClick={() => setMode("protect")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "protect" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Lock className="h-3.5 w-3.5" /> 加密
            </button>
            <button
              onClick={() => setMode("unlock")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === "unlock" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              <LockOpen className="h-3.5 w-3.5" /> 解锁
            </button>
          </div>
          <UploadZone onFile={handleFile} disabled={step === "uploading"} maxSize={100 * 1024 * 1024} />
          {step === "uploading" && file && (
            <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm">正在上传...</span>
            </div>
          )}
        </div>
      )}

      {(step === "ready" || step === "processing" || step === "done") && file && (
        <div className="space-y-4">
          <FileCard file={file} />

          {step === "ready" && (
            <div className="space-y-2">
              <Label>{mode === "protect" ? "设置密码" : "输入文件密码"}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "protect" ? "2-32 位" : "输入 PDF 的打开密码"}
                maxLength={32}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button onClick={handleAction} disabled={password.length < 2} className="min-w-[160px]">
                {mode === "protect" ? "加密 PDF" : "解锁 PDF"}
              </Button>
            )}
            {step === "processing" && (
              <Button disabled className="min-w-[160px]">
                <Loader2 className="h-4 w-4 animate-spin" /> 处理中...
              </Button>
            )}
            {step === "done" && (
              <DownloadButton
                url={downloadUrl ?? undefined}
                filename={file.name.replace(/\.pdf$/i, "") + (mode === "protect" ? "_加密.pdf" : "_解锁.pdf")}
                label={mode === "protect" ? "下载加密 PDF" : "下载解锁 PDF"}
              />
            )}
            <Button variant="outline" onClick={handleReset}>重新上传</Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}
    </ToolLayout>
  )
}
