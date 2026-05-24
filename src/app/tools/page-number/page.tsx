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

const POSITIONS: { value: string; label: string }[] = [
  { value: "bottom-center", label: "底部居中" },
  { value: "bottom-right", label: "底部居右" },
  { value: "bottom-left", label: "底部居左" },
  { value: "top-center", label: "顶部居中" },
  { value: "top-right", label: "顶部居右" },
  { value: "top-left", label: "顶部居左" },
]

export default function PageNumberPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [position, setPosition] = useState("bottom-center")
  const [fontSize, setFontSize] = useState(10)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (f: File) => {
    setFile(f); setStep("uploading"); setError(null)
    try {
      const fd = new FormData(); fd.append("file", f)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error("上传失败")
      const { r2Key: key } = await res.json()
      setR2Key(key); setStep("ready")
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败")
      setStep("upload")
    }
  }

  const handleGo = async () => {
    if (!r2Key) return
    setStep("processing"); setError(null)
    try {
      const res = await fetch("/api/page-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key, position, fontSize }),
      })
      if (!res.ok) { const { error: msg } = await res.json(); throw new Error(msg || "失败") }
      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败")
      setStep("ready")
    }
  }

  const reset = () => { setFile(null); setR2Key(null); setDownloadUrl(null); setError(null); setStep("upload") }

  return (
    <ToolLayout title="PDF 页码" description="在 PDF 每页添加页码，支持多种位置。">
      {(step === "upload" || step === "uploading") && (
        <div className="space-y-4">
          <UploadZone onFile={handleFile} disabled={step === "uploading"} maxSize={100 * 1024 * 1024} />
          {step === "uploading" && <p className="text-sm text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> 上传中...</p>}
        </div>
      )}

      {(step === "ready" || step === "processing" || step === "done") && file && (
        <div className="space-y-4">
          <FileCard file={file} />

          {step === "ready" && (
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <div className="space-y-2">
                <Label>位置</Label>
                <div className="grid grid-cols-3 gap-2">
                  {POSITIONS.map((p) => (
                    <Button key={p.value} variant={position === p.value ? "default" : "outline"} size="sm" onClick={() => setPosition(p.value)}>
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>字号</Label>
                <Input type="number" value={fontSize} onChange={(e) => setFontSize(Math.min(30, Math.max(6, +e.target.value || 6)))} min={6} max={30} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {step === "ready" && <Button onClick={handleGo}>添加页码</Button>}
            {step === "processing" && <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> 处理中...</Button>}
            {step === "done" && <DownloadButton url={downloadUrl!} filename={file.name.replace(/\.pdf$/i, "") + "_页码.pdf"} label="下载" />}
            <Button variant="outline" onClick={reset}>重新上传</Button>
          </div>
        </div>
      )}

      {error && <div className="rounded border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    </ToolLayout>
  )
}
