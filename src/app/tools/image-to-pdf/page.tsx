"use client"

import { useState, useRef } from "react"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, X, GripVertical } from "lucide-react"

type Step = "select" | "ready" | "processing" | "done"

export default function ImageToPdfPage() {
  const [step, setStep] = useState<Step>("select")
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return

    const newFiles = selected.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }))
    setFiles((prev) => [...prev, ...newFiles].slice(0, 30))
    setStep("ready")
    setError(null)
  }

  const removeFile = (i: number) => {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    if (next.length === 0) setStep("select")
  }

  const handleConvert = async () => {
    if (files.length === 0) return
    setStep("processing")
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((f) => formData.append("files", f.file))

      const res = await fetch("/api/image-to-pdf", { method: "POST", body: formData })

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "转换失败" }))
        throw new Error(msg || "转换失败")
      }

      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setPageCount(data.pageCount)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview))
    setFiles([])
    setDownloadUrl(null)
    setPageCount(0)
    setError(null)
    setStep("select")
  }

  return (
    <ToolLayout
      title="图片转 PDF"
      description="将多张图片合成为 PDF 文件，支持 JPG、PNG 格式。"
    >
      <div className="space-y-4">
        {(step === "select" || step === "ready") && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleSelect}
              className="hidden"
            />

            <div
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">选择图片</p>
              <p className="text-xs text-muted-foreground">支持 JPG、PNG、WebP，每次最多 30 张</p>
            </div>
          </>
        )}

        {files.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative group rounded-lg border overflow-hidden">
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="w-full aspect-square object-cover"
                />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="p-1 text-[10px] text-muted-foreground truncate">
                  {f.file.name}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {step === "ready" && files.length > 0 && (
            <Button onClick={handleConvert} className="min-w-[160px]">
              生成 PDF（{files.length} 页）
            </Button>
          )}
          {step === "processing" && (
            <Button disabled className="min-w-[160px]">
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中...
            </Button>
          )}
          {step === "done" && (
            <DownloadButton
              url={downloadUrl ?? undefined}
              filename="images-to-pdf.pdf"
              label={`下载 PDF（${pageCount} 页）`}
            />
          )}
          {files.length > 0 && (
            <Button variant="outline" onClick={handleReset}>
              清空重选
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}
    </ToolLayout>
  )
}
