"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"

export default function PdfToWordPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const handleConvert = async () => {
    if (!r2Key) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || "转换失败")
      }

      const { downloadUrl: url } = await res.json()
      setDownloadUrl(url)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败")
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
      title="PDF 转 Word"
      description="将 PDF 文档转换为可编辑的 .docx 文件，保留原始排版格式。最大支持 200 页。"
    >
      {/* Upload */}
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

      {/* File ready */}
      {(step === "ready" || step === "processing" || step === "done") && file && (
        <div className="space-y-4">
          <FileCard file={file} />
          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button onClick={handleConvert} className="min-w-[160px]">
                开始转换
              </Button>
            )}
            {step === "processing" && (
              <Button disabled className="min-w-[160px]">
                <Loader2 className="h-4 w-4 animate-spin" />
                转换中...
              </Button>
            )}
            {step === "done" && (
              <DownloadButton url={downloadUrl ?? undefined} filename={file.name.replace(/\.pdf$/i, ".docx")} />
            )}
            <Button variant="outline" onClick={handleReset}>
              重新上传
            </Button>
          </div>
        </div>
      )}

      {/* Error */}
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
