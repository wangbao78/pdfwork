"use client"

import { useState, useRef } from "react"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, X } from "lucide-react"
import { UpgradePrompt, useCanUsePro } from "@/components/shared/UpgradePrompt"

type Step = "select" | "uploading" | "ready" | "processing" | "done"

const OPS = [
  { value: "convert", label: "PDF 转 Word" },
  { value: "compress", label: "压缩 PDF" },
  { value: "watermark", label: "加水印" },
]

export default function BatchPage() {
  const { canUse } = useCanUsePro()
  const [step, setStep] = useState<Step>("select")
  const [files, setFiles] = useState<{ file: File; r2Key?: string }[]>([])
  const [operation, setOperation] = useState("convert")
  const [watermarkText, setWatermarkText] = useState("机密")
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, ok: 0, failed: 0 })
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const pdfs = selected.filter((f) => f.name.toLowerCase().endsWith(".pdf"))
    if (pdfs.length === 0) return
    setFiles((prev) => [...prev, ...pdfs.map((f) => ({ file: f }))].slice(0, 20))
    setStep("ready")
  }

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const uploadAll = async (): Promise<string[]> => {
    setStep("uploading")
    const keys: string[] = []
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData()
      fd.append("file", files[i].file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error(`上传 ${files[i].file.name} 失败`)
      const { r2Key } = await res.json()
      keys.push(r2Key)
      setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, r2Key } : f))
    }
    return keys
  }

  const handleProcess = async () => {
    setError(null)
    try {
      setStep("uploading")
      const keys = await uploadAll()

      setStep("processing")
      const body: Record<string, unknown> = { r2Keys: keys, operation }
      if (operation === "watermark") body.watermarkText = watermarkText

      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const { error: msg } = await res.json(); throw new Error(msg || "处理失败") }
      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStats({ total: data.total, ok: data.ok, failed: data.failed })
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "处理失败")
      setStep("ready")
    }
  }

  const reset = () => {
    setFiles([]); setDownloadUrl(null); setError(null)
    setStep("select"); setStats({ total: 0, ok: 0, failed: 0 })
  }

  if (!canUse) {
    return (
      <ToolLayout title="批量处理" description="一次上传多个 PDF，统一操作，结果打包下载。">
        <UpgradePrompt tool="批量处理" />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout title="批量处理" description="一次上传多个 PDF，统一操作，结果打包下载。">
      <div className="space-y-4">
        {(step === "select" || step === "ready" || step === "uploading") && (
          <>
            <input ref={inputRef} type="file" accept=".pdf" multiple onChange={handleSelect} className="hidden" />
            <div
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">选择 PDF 文件</p>
              <p className="text-xs text-muted-foreground">2-20 个文件</p>
            </div>
          </>
        )}

        {files.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded border bg-card px-3 py-2">
                <span className="flex-1 text-sm truncate">{f.file.name}</span>
                {step !== "uploading" && (
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        )}

        {step === "ready" && files.length >= 2 && (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="space-y-2">
              <Label>操作</Label>
              <div className="flex gap-2">
                {OPS.map((op) => (
                  <Button key={op.value} variant={operation === op.value ? "default" : "outline"} size="sm" onClick={() => setOperation(op.value)}>
                    {op.label}
                  </Button>
                ))}
              </div>
            </div>
            {operation === "watermark" && (
              <div className="space-y-2">
                <Label>水印文字</Label>
                <Input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} maxLength={100} />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {step === "ready" && files.length >= 2 && (
            <Button onClick={handleProcess}>开始批量处理（{files.length} 个文件）</Button>
          )}
          {step === "uploading" && <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> 上传中...</Button>}
          {step === "processing" && <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> 处理中...</Button>}
          {step === "done" && (
            <>
              <DownloadButton url={downloadUrl!} filename="batch_results.zip" label={`下载结果 (${stats.ok}/${stats.total})`} />
              {stats.failed > 0 && <p className="self-center text-sm text-muted-foreground">{stats.failed} 个文件处理失败</p>}
            </>
          )}
          {files.length > 0 && step !== "processing" && step !== "uploading" && (
            <Button variant="outline" onClick={reset}>重新开始</Button>
          )}
        </div>

        {error && <div className="rounded border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      </div>
    </ToolLayout>
  )
}
