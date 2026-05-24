"use client"

import { useState } from "react"
import { ToolLayout } from "@/components/shared/ToolLayout"
import { DownloadButton } from "@/components/shared/DownloadButton"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Code2 } from "lucide-react"

type Step = "edit" | "processing" | "done"

const SAMPLE = `<h1>Hello World</h1>
<p>这是一段<strong>中文</strong>测试内容。</p>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
  <tr><th>列 A</th><th>列 B</th></tr>
  <tr><td>数据 1</td><td>数据 2</td></tr>
</table>`

export default function HtmlToPdfPage() {
  const [step, setStep] = useState<Step>("edit")
  const [html, setHtml] = useState(SAMPLE)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConvert = async () => {
    if (!html.trim()) return
    setStep("processing"); setError(null)
    try {
      const res = await fetch("/api/html-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      })
      if (!res.ok) { const { error: msg } = await res.json(); throw new Error(msg || "转换失败") }
      const data = await res.json()
      setDownloadUrl(data.downloadUrl)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "转换失败")
      setStep("edit")
    }
  }

  return (
    <ToolLayout title="HTML 转 PDF" description="将 HTML 内容转换为 PDF 文件。">
      <div className="space-y-4">
        {step !== "processing" && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> HTML 内容
            </Label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="w-full min-h-[280px] rounded-lg border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="在此粘贴 HTML 代码..."
              spellCheck={false}
            />
          </div>
        )}

        <div className="flex gap-3">
          {step === "edit" && <Button onClick={handleConvert} disabled={!html.trim()}>转换为 PDF</Button>}
          {step === "processing" && <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> 转换中...</Button>}
          {step === "done" && <DownloadButton url={downloadUrl!} filename="html-output.pdf" label="下载 PDF" />}
          {step === "done" && <Button variant="outline" onClick={() => setStep("edit")}>继续编辑</Button>}
          {step === "edit" && <Button variant="outline" onClick={() => setHtml("")}>清空</Button>}
        </div>

        {error && <div className="rounded border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      </div>
    </ToolLayout>
  )
}
