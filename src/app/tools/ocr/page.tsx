"use client"

import { useState } from "react"
import { UploadZone, FileCard } from "@/components/shared/UploadZone"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Loader2, ScanText } from "lucide-react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"

type Step = "upload" | "uploading" | "ready" | "processing" | "done"

export default function OcrPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [r2Key, setR2Key] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState("")
  const [pageCount, setPageCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [trialUsed, setTrialUsed] = useState(false)

  const handleFile = async (f: File) => {
    setFile(f); setStep("uploading"); setError(null)
    try {
      const fd = new FormData(); fd.append("file", f)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || "上传失败") }
      const { r2Key: key } = await res.json()
      setR2Key(key); setStep("ready")
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败")
      setStep("upload")
    }
  }

  const handleOcr = async () => {
    if (!r2Key) return
    setStep("processing"); setError(null)
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ r2Key }),
      })
      if (!res.ok) { const data = await res.json().catch(() => ({})); if (data.trial) setTrialUsed(true); throw new Error(data.error || "识别失败") }
      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setPreviewText(data.text)
      setPageCount(data.pages)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "识别失败")
      setStep("ready")
    }
  }

  const reset = () => { setFile(null); setR2Key(null); setDownloadUrl(null); setPreviewText(""); setError(null); setStep("upload") }

  if (trialUsed) {
    return (
      <ToolLayout title="OCR 识别" description="从扫描件或图片 PDF 中识别文字，输出为 Word 文档。">
        <UpgradePrompt tool="OCR 识别" reason="trial_used" />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout
      title="OCR 识别"
      description="从扫描件或图片 PDF 中识别文字，输出为 Word 文档。适用于扫描的纸质文档、图片制成的 PDF。"
    >
      {(step === "upload" || step === "uploading") && (
        <div className="space-y-4">
          <UploadZone onFile={handleFile} disabled={step === "uploading"} maxSize={50 * 1024 * 1024} />
          {step === "uploading" && <p className="text-sm text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> 上传中...</p>}
        </div>
      )}

      {(step === "ready" || step === "processing" || step === "done") && file && (
        <div className="space-y-4">
          <FileCard file={file} />

          <div className="flex gap-3">
            {step === "ready" && <Button onClick={handleOcr}>开始 OCR 识别</Button>}
            {step === "processing" && <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> 识别中（可能需要 1-2 分钟）...</Button>}
            {step === "done" && <DownloadButton url={downloadUrl!} filename={file.name.replace(/\.pdf$/i, "_OCR.docx")} label="下载 Word" />}
            <Button variant="outline" onClick={reset}>重新上传</Button>
          </div>

          {step === "done" && previewText && (
            <div className="rounded-lg border bg-card p-4 max-h-80 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <ScanText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">识别结果预览（{pageCount} 页）</span>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans">{previewText}</pre>
            </div>
          )}
        </div>
      )}

      {error && <div className="rounded border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
    </ToolLayout>
  )
}
