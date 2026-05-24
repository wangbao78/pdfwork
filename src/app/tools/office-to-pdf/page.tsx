"use client"

import { useState } from "react"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, FileText } from "lucide-react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"

type Step = "select" | "uploading" | "processing" | "done"

export default function OfficeToPdfPage() {
  const [step, setStep] = useState<Step>("select")
  const [file, setFile] = useState<File | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trialUsed, setTrialUsed] = useState(false)

  const handleFile = async (f: File) => {
    setFile(f)
    setStep("uploading")
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", f)
      const res = await fetch("/api/office-to-pdf", { method: "POST", body: formData })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.trial) setTrialUsed(true)
        throw new Error(data.error || "转换失败")
      }

      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败")
      setStep("select")
    }
  }

  if (trialUsed) {
    return (
      <ToolLayout title="Office 转 PDF" description="将 Word、Excel、PPT 文件转换为 PDF。">
        <UpgradePrompt tool="Office 转 PDF" reason="trial_used" />
      </ToolLayout>
    )
  }

  return (
    <ToolLayout
      title="Office 转 PDF"
      description="将 Word、Excel、PPT 文件转换为 PDF。"
    >
      <div className="space-y-4">
        {(step === "select") && (
          <>
            <Label className="block">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-primary/50 transition-colors">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">选择 Office 文件</p>
                <p className="text-xs text-muted-foreground">Word .docx / Excel .xlsx / PPT .pptx，上限 50MB</p>
              </div>
              <input
                type="file"
                accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
            </Label>
          </>
        )}

        {file && (
          <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{file.name}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {step === "uploading" && (
            <Button disabled className="min-w-[160px]">
              <Loader2 className="h-4 w-4 animate-spin" /> 转换中...
            </Button>
          )}
          {step === "done" && (
            <DownloadButton
              url={downloadUrl ?? undefined}
              filename={file?.name.replace(/\.\w+$/, "") + ".pdf"}
              label="下载 PDF"
            />
          )}
          {step !== "select" && (
            <Button variant="outline" onClick={() => { setStep("select"); setFile(null); setError(null) }}>
              重新转换
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
