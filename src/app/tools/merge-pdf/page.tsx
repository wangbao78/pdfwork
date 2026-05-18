"use client"

import { useRef, useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"

interface UploadedFile {
  file: File
  r2Key: string
}

type Step = "upload" | "uploading" | "ready" | "processing" | "done"

export default function MergePdfPage() {
  const [step, setStep] = useState<Step>("upload")
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (f: File): Promise<UploadedFile | null> => {
    try {
      const formData = new FormData()
      formData.append("file", f)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "上传失败" }))
        throw new Error(msg || "上传失败")
      }
      const { r2Key } = await res.json()
      return { file: f, r2Key }
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败")
      return null
    }
  }

  const handleAddFiles = async (newFiles: File[]) => {
    setError(null)
    setStep("uploading")

    for (const f of newFiles) {
      const result = await uploadFile(f)
      if (!result) break
      setFiles((prev) => [...prev, result])
    }

    setStep("ready")
  }

  const handleAddMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files
    if (!fl || fl.length === 0) return
    for (const f of Array.from(fl)) {
      const result = await uploadFile(f)
      if (!result) break
      setFiles((prev) => [...prev, result])
    }
    // Reset input so same file can be re-added
    e.target.value = ""
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMerge = async () => {
    if (files.length < 2) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Keys: files.map((f) => f.r2Key) }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || "合并失败")
      }

      const { downloadUrl: url } = await res.json()
      setDownloadUrl(url)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "合并失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    setFiles([])
    setDownloadUrl(null)
    setError(null)
    setStep("upload")
  }

  return (
    <ToolLayout
      title="合并 PDF"
      description="将多个 PDF 文件按顺序合并为一个文档。最多 20 个文件。"
    >
      {/* Initial upload or add more */}
      {(step === "upload" || step === "uploading") && (
        <div className="space-y-4">
          <UploadZone
            onFile={(f) => handleAddFiles([f])}
            disabled={step === "uploading"}
            maxSize={100 * 1024 * 1024}
            multiple
          />
          {step === "uploading" && (
            <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在上传...
            </div>
          )}
        </div>
      )}

      {/* File list + actions */}
      {(step === "ready" || step === "processing" || step === "done") && files.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            {files.map((f, i) => (
              <FileCard
                key={f.r2Key}
                file={f.file}
                index={i}
                onRemove={step === "ready" ? () => handleRemoveFile(i) : undefined}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {step === "ready" && (
              <>
                <Button onClick={handleMerge} disabled={files.length < 2} size="lg">
                  合并 ({files.length} 个文件)
                </Button>
                {files.length < 20 && (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => addInputRef.current?.click()}
                    >
                      <Plus className="h-4 w-4" />
                      添加文件
                    </Button>
                    <input
                      ref={addInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={handleAddMore}
                    />
                  </>
                )}
              </>
            )}
            {step === "processing" && (
              <Button disabled size="lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                合并中...
              </Button>
            )}
            {step === "done" && (
              <DownloadButton url={downloadUrl ?? undefined} filename="merged.pdf" label="下载合并结果" />
            )}
            <Button variant="outline" onClick={handleReset} size="lg">
              重新开始
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
