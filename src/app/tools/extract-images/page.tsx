"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Loader2, Image as ImageIcon, PackageOpen } from "lucide-react"
import type { ImageInfo } from "@/lib/pdf/extract-images"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"

export default function ExtractImagesPage() {
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

  const handleExtract = async () => {
    if (!r2Key) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/extract-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key }),
      })

      const data = await res.json()

      if (!res.ok && res.status !== 200) {
        throw new Error(data.error || "提取失败")
      }

      if (!data.images || data.images.length === 0) {
        throw new Error(data.error || "PDF 中没有可提取的图片")
      }

      setImages(data.images)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "提取失败")
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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <ToolLayout
      title="提取图片"
      description="从 PDF 中提取所有内嵌图片，支持逐个下载。"
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

          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button onClick={handleExtract} className="min-w-[160px]">
                提取图片
              </Button>
            )}
            {step === "processing" && (
              <Button disabled className="min-w-[160px]">
                <Loader2 className="h-4 w-4 animate-spin" />
                提取中...
              </Button>
            )}
            {step === "done" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                提取了 {images.length} 张图片
              </div>
            )}
            <Button variant="outline" onClick={handleReset}>
              重新上传
            </Button>
          </div>

          {step === "done" && images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card overflow-hidden group"
                >
                  <div className="aspect-square bg-muted/30 flex items-center justify-center">
                    <img
                      src={img.downloadUrl}
                      alt={`第${img.page}页-图${img.index}`}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs text-muted-foreground truncate">
                      第{img.page}页 · {img.width}&times;{img.height} · {formatSize(img.size)}
                    </p>
                    <a
                      href={img.downloadUrl}
                      download={img.filename}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      下载 {img.format.toUpperCase()}
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
