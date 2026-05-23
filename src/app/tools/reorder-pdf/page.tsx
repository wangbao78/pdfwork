"use client"

import { useState, useCallback } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Loader2, GripVertical } from "lucide-react"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"

export default function ReorderPdfPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const detectPages = async (f: File) => {
    try {
      const { PDFDocument } = await import("pdf-lib")
      const doc = await PDFDocument.load(await f.arrayBuffer())
      return doc.getPageCount()
    } catch { return 0 }
  }

  const handleFile = async (f: File) => {
    setFile(f)
    setStep("uploading")
    setError(null)

    const pc = await detectPages(f)
    setPageCount(pc)
    setOrder(Array.from({ length: pc }, (_, i) => i + 1))

    try {
      const formData = new FormData()
      formData.append("file", f)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("上传失败")
      const { r2Key: key } = await res.json()
      setR2Key(key)
      setStep("ready")
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败")
      setStep("upload")
    }
  }

  const handleDragStart = (i: number) => setDragIdx(i)
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const next = [...order]
    const [item] = next.splice(dragIdx, 1)
    next.splice(i, 0, item)
    setOrder(next)
    setDragIdx(i)
  }
  const handleDragEnd = () => setDragIdx(null)

  const handleReorder = async () => {
    if (!r2Key) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key, order }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || "排序失败")
      }
      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setPageCount(data.pageCount)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "排序失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    setFile(null); setR2Key(null); setOrder([]); setDownloadUrl(null)
    setError(null); setStep("upload"); setDragIdx(null)
  }

  return (
    <ToolLayout
      title="页面排序"
      description="拖拽调整 PDF 页面顺序，点击「应用排序」生成新文件。"
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
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                拖拽调序（{pageCount} 页）
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {order.map((p, i) => (
                  <div
                    key={`${p}-${i}`}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-1.5 rounded-lg border bg-card p-2 cursor-grab active:cursor-grabbing ${
                      dragIdx === i ? "opacity-50 border-primary" : ""
                    }`}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-sm font-mono">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button onClick={handleReorder} className="min-w-[160px]">应用排序</Button>
            )}
            {step === "processing" && (
              <Button disabled className="min-w-[160px]">
                <Loader2 className="h-4 w-4 animate-spin" /> 处理中...
              </Button>
            )}
            {step === "done" && (
              <DownloadButton
                url={downloadUrl ?? undefined}
                filename={file.name.replace(/\.pdf$/i, "") + "_重排.pdf"}
                label={`下载 PDF（${pageCount} 页）`}
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
