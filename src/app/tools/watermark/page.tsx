"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"

export default function WatermarkPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [text, setText] = useState("机密")
  const [fontSize, setFontSize] = useState(40)
  const [opacity, setOpacity] = useState(0.15)
  const [rotation, setRotation] = useState(-45)
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

  const handleWatermark = async () => {
    if (!r2Key || !text.trim()) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/watermark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          r2Key,
          text: text.trim(),
          fontSize,
          opacity,
          rotation,
        }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || "水印添加失败")
      }

      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "水印添加失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    setFile(null)
    setR2Key(null)
    setDownloadUrl(null)
    setError(null)
    setStep("upload")
  }

  return (
    <ToolLayout
      title="PDF 加水印"
      description="给 PDF 每页添加文字水印，支持调整大小、透明度、角度。"
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
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <div className="space-y-2">
                <Label>水印文字</Label>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="输入水印文字，如：机密、内部资料"
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>字号</Label>
                  <Input
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Math.min(100, Math.max(10, +e.target.value || 10)))}
                    min={10}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>透明度 (%)</Label>
                  <Input
                    type="number"
                    value={Math.round(opacity * 100)}
                    onChange={(e) => setOpacity(Math.min(100, Math.max(1, +e.target.value || 1)) / 100)}
                    min={1}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>角度 (°)</Label>
                  <Input
                    type="number"
                    value={rotation}
                    onChange={(e) => setRotation(Math.min(90, Math.max(-90, +e.target.value || 0)))}
                    min={-90}
                    max={90}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button onClick={handleWatermark} className="min-w-[160px]">
                生成水印
              </Button>
            )}
            {step === "processing" && (
              <Button disabled className="min-w-[160px]">
                <Loader2 className="h-4 w-4 animate-spin" />
                处理中...
              </Button>
            )}
            {step === "done" && (
              <DownloadButton
                url={downloadUrl ?? undefined}
                filename={file.name.replace(/\.pdf$/i, "") + "_水印.pdf"}
                label="下载带水印的 PDF"
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
