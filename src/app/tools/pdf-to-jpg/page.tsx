"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { ImageInfo } from "@/lib/pdf/extract-images"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"

export default function PdfToJpgPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [images, setImages] = useState<ImageInfo[]>([])
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

  const handleConvert = async () => {
    if (!r2Key) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/pdf-to-jpg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || "转换失败")
      }

      const data = await res.json()
      setImages(data.images)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    setFile(null)
    setR2Key(null)
    setImages([])
    setError(null)
    setStep("upload")
  }

  return (
    <ToolLayout
      title="PDF 转 JPG"
      description="将 PDF 每页转为 JPG 图片，200 DPI 清晰度。"
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

          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button onClick={handleConvert} className="min-w-[160px]">开始转换</Button>
            )}
            {step === "processing" && (
              <Button disabled className="min-w-[160px]">
                <Loader2 className="h-4 w-4 animate-spin" /> 转换中...
              </Button>
            )}
            {step === "done" && (
              <span className="text-sm text-muted-foreground">
                共 {images.length} 页，可逐个下载
              </span>
            )}
            <Button variant="outline" onClick={handleReset}>重新上传</Button>
          </div>

          {step === "done" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={i} className="rounded-lg border bg-card overflow-hidden">
                  <div className="aspect-[3/4] bg-muted/30 flex items-center justify-center">
                    <img
                      src={img.downloadUrl}
                      alt={`第${img.page}页`}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground">
                      第{img.page}页 · {img.width}&times;{img.height}
                    </p>
                    <a
                      href={img.downloadUrl}
                      download={img.filename}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      下载 JPG
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
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
