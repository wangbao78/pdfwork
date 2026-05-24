"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Image } from "lucide-react"

type Step = "upload" | "uploading" | "wm_select" | "ready" | "processing" | "done"

export default function ImageWatermarkPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [wmFile, setWmFile] = useState<File | null>(null)
  const [wmPreview, setWmPreview] = useState("")
  const [opacity, setOpacity] = useState(30)
  const [scale, setScale] = useState(25)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePdf = async (f: File) => {
    setFile(f)
    setStep("uploading")
    setError(null)
    try {
      const fd = new FormData(); fd.append("file", f)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error("上传失败")
      const { r2Key: key } = await res.json()
      setR2Key(key)
      setStep("wm_select")
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败")
      setStep("upload")
    }
  }

  const handleWmFile = (f: File) => {
    setWmFile(f)
    setWmPreview(URL.createObjectURL(f))
    setStep("ready")
  }

  const handleGo = async () => {
    if (!r2Key || !wmFile) return
    setStep("processing")
    setError(null)
    try {
      const fd = new FormData()
      fd.append("r2Key", r2Key)
      fd.append("watermark", wmFile)
      fd.append("opacity", String(opacity / 100))
      fd.append("scale", String(scale / 100))
      const res = await fetch("/api/image-watermark", { method: "POST", body: fd })
      if (!res.ok) { const { error: msg } = await res.json(); throw new Error(msg || "失败") }
      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "水印添加失败")
      setStep("ready")
    }
  }

  const reset = () => {
    setFile(null); setR2Key(null); setWmFile(null); setWmPreview("")
    setDownloadUrl(null); setError(null); setStep("upload")
  }

  return (
    <ToolLayout title="图片水印" description="上传图片作为水印叠加到 PDF 中心位置。">
      {(step === "upload" || step === "uploading") && (
        <div className="space-y-4">
          <UploadZone onFile={handlePdf} disabled={step === "uploading"} maxSize={100 * 1024 * 1024} />
          {step === "uploading" && <p className="text-sm text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> 上传中...</p>}
        </div>
      )}

      {file && <FileCard file={file} />}

      {(step === "wm_select" || step === "ready" || step === "processing" || step === "done") && (
        <div className="space-y-4">
          {step !== "done" && (
            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              {wmPreview ? (
                <div className="space-y-3">
                  <img src={wmPreview} alt="水印预览" className="max-h-32 mx-auto rounded" />
                  <p className="text-xs text-muted-foreground">{wmFile?.name}</p>
                </div>
              ) : (
                <>
                  <Image className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">选择水印图片</p>
                  <p className="text-xs text-muted-foreground">PNG 透明底效果最佳</p>
                </>
              )}
              <Label className="mt-3 cursor-pointer inline-block">
                <span className="rounded-md bg-muted px-3 py-1.5 text-xs">选择图片</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleWmFile(e.target.files[0])} />
              </Label>
            </div>
          )}

          {step === "ready" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>透明度 ({opacity}%)</Label>
                <Input type="number" value={opacity} onChange={(e) => setOpacity(Math.min(100, Math.max(1, +e.target.value || 1)))} />
              </div>
              <div className="space-y-2">
                <Label>大小 ({scale}%)</Label>
                <Input type="number" value={scale} onChange={(e) => setScale(Math.min(100, Math.max(5, +e.target.value || 5)))} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {step === "wm_select" && wmFile && (
              <Button onClick={() => setStep("ready")}>继续设置</Button>
            )}
            {step === "ready" && (
              <Button onClick={handleGo}>生成水印</Button>
            )}
            {step === "processing" && <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> 处理中...</Button>}
            {step === "done" && <DownloadButton url={downloadUrl!} filename={file?.name.replace(/\.pdf$/i, "") + "_图片水印.pdf"} label="下载" />}
            <Button variant="outline" onClick={reset}>重新开始</Button>
          </div>
        </div>
      )}

      {error && <div className="rounded border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    </ToolLayout>
  )
}
