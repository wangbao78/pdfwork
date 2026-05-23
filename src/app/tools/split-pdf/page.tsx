"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, FileText } from "lucide-react"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"

export default function SplitPdfPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [pageInput, setPageInput] = useState("")
  const [parsedPages, setParsedPages] = useState<number[]>([])
  const [resultPages, setResultPages] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const detectPages = async (f: File) => {
    try {
      const { PDFDocument } = await import("pdf-lib")
      const buf = await f.arrayBuffer()
      const doc = await PDFDocument.load(buf)
      return doc.getPageCount()
    } catch {
      return 0
    }
  }

  const handleFile = async (f: File) => {
    setFile(f)
    setStep("uploading")
    setError(null)

    const pageCount = await detectPages(f)
    setTotalPages(pageCount)

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
      if (pageCount > 0) {
        setPageInput(`1-${pageCount}`)
        setParsedPages(Array.from({ length: pageCount }, (_, i) => i + 1))
      }
      setStep("ready")
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败")
      setStep("upload")
    }
  }

  const parseInput = (input: string): number[] => {
    const pages = new Set<number>()
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean)
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(Number)
        if (isNaN(a) || isNaN(b)) continue
        const start = Math.max(1, Math.min(a, b))
        const end = Math.min(totalPages || 9999, Math.max(a, b))
        for (let i = start; i <= end; i++) pages.add(i)
      } else {
        const n = Number(part)
        if (!isNaN(n) && n >= 1 && n <= (totalPages || 9999)) pages.add(n)
      }
    }
    return [...pages].sort((a, b) => a - b)
  }

  const handleInputChange = (value: string) => {
    setPageInput(value)
    setParsedPages(parseInput(value))
  }

  const handleSplit = async () => {
    if (!r2Key || parsedPages.length === 0) return
    setStep("processing")
    setError(null)

    try {
      const res = await fetch("/api/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key, pages: parsedPages }),
      })

      if (!res.ok) {
        const { error: msg } = await res.json()
        throw new Error(msg || "拆分失败")
      }

      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setResultPages(data.pageCount)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "拆分失败")
      setStep("ready")
    }
  }

  const handleReset = () => {
    setFile(null)
    setR2Key(null)
    setTotalPages(0)
    setPageInput("")
    setParsedPages([])
    setResultPages(0)
    setDownloadUrl(null)
    setError(null)
    setStep("upload")
  }

  return (
    <ToolLayout
      title="拆分 PDF"
      description="从 PDF 中抽取指定页面，支持范围输入如 1-5, 8, 10-12。"
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

          {totalPages > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              共 {totalPages} 页
            </div>
          )}

          {step === "ready" && (
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <div className="space-y-2">
                <Label>保留的页码范围</Label>
                <Input
                  value={pageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="例：1-5, 8, 10-12"
                />
                <p className="text-xs text-muted-foreground">
                  用逗号分隔，支持范围 如 1-5。输入后下方显示预览。
                </p>
              </div>

              {parsedPages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {parsedPages.slice(0, 30).map((p) => (
                    <span
                      key={p}
                      className="inline-flex h-6 w-8 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary"
                    >
                      {p}
                    </span>
                  ))}
                  {parsedPages.length > 30 && (
                    <span className="inline-flex items-center px-2 text-xs text-muted-foreground">
                      ...共 {parsedPages.length} 页
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {step === "ready" && (
              <Button
                onClick={handleSplit}
                disabled={parsedPages.length === 0}
                className="min-w-[160px]"
              >
                提取 {parsedPages.length > 0 ? `${parsedPages.length} 页` : ""}
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
                filename={file.name.replace(/\.pdf$/i, "") + "_拆分.pdf"}
                label={`下载（${resultPages} 页）`}
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
