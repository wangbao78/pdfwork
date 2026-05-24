"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Loader2, RotateCw } from "lucide-react"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"
type Rotation = 90 | 180 | 270

export default function RotatePdfPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [rotation, setRotation] = useState<Rotation>(90)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleRotate = async () => {
    if (!r2Key) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key, rotation }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "旋转失败" }))
        throw new Error(msg || "旋转失败")
      }

      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "旋转失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    setFile(null)
    setR2Key(null)
    setDownloadUrl(null)
    setError(null)
    setRotation(90)
    setStep("upload")
  }

  return (
    <ToolLayout
      title="旋转 PDF"
      description="将 PDF 所有页面按指定角度旋转。"
    >
      {(step === "upload" || step === "uploading") && (
        <div className="space-y-4">
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
            <div className="flex items-center gap-3">
              {([90, 180, 270] as Rotation[]).map((r) => (
                <Button
                  key={r}
                  variant={rotation === r ? "default" : "outline"}
                  onClick={() => setRotation(r)}
                  className="min-w-[80px]"
                >
                  <RotateCw className="h-4 w-4 mr-1" />
                  {r}°
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button onClick={handleRotate} className="min-w-[160px]">
                旋转 {rotation}°
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
                filename={file.name.replace(/\.pdf$/i, "") + `_旋转${rotation}.pdf`}
                label="下载旋转后的 PDF"
              />
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
        </div>
      )}
    </ToolLayout>
  )
}
