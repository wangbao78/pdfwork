import { NextResponse } from "next/server"
import { batchProcess, type BatchOptions } from "@/lib/pdf/batch"
import { cleanupOld } from "@/lib/cleanup"
import { requirePro, trackUsage, getAccessUser } from "@/lib/access"
import { updateFileStatusBulk } from "@/lib/file-status"

export async function POST(req: Request) {
  const block = await requirePro(req)
  if (block) return block
  cleanupOld()
  let rks: string[] = []
  try {
    const { r2Keys, operation, watermarkText, compressLevel } = await req.json()
    rks = r2Keys

    if (!Array.isArray(rks) || rks.length < 2) {
      return NextResponse.json({ error: "至少选择 2 个文件" }, { status: 400 })
    }
    if (rks.length > 20) {
      return NextResponse.json({ error: "最多 20 个文件" }, { status: 400 })
    }

    const ops = ["convert", "compress", "watermark"]
    const op: BatchOptions["operation"] = ops.includes(operation) ? operation : "convert"

    await updateFileStatusBulk(rks, "PROCESSING", "批量处理")
    const result = await batchProcess(rks, {
      operation: op,
      watermarkText: watermarkText?.slice(0, 100) || "机密",
      compressLevel: compressLevel === "high" ? "high" : "standard",
    })

    trackUsage(await getAccessUser())
    await updateFileStatusBulk(rks, "DONE")
    return NextResponse.json(result)
  } catch (e) {
    if (rks.length > 0) await updateFileStatusBulk(rks, "ERROR")
    const message = e instanceof Error ? e.message : "批量处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
