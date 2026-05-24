import { NextResponse } from "next/server"
import { mergePdfs } from "@/lib/pdf/merge"
import { cleanupOld } from "@/lib/cleanup"
import { updateFileStatusBulk } from "@/lib/file-status"

export async function POST(req: Request) {
  cleanupOld()
  let rks: string[] = []
  try {
    const { r2Keys } = await req.json()
    rks = r2Keys

    if (!rks || !Array.isArray(rks) || rks.length < 2) {
      return NextResponse.json(
        { error: "至少需要两个 PDF 文件" },
        { status: 400 },
      )
    }

    if (rks.length > 20) {
      return NextResponse.json(
        { error: "最多支持 20 个文件" },
        { status: 400 },
      )
    }

    await updateFileStatusBulk(rks, "PROCESSING")
    const result = await mergePdfs(rks)

    await updateFileStatusBulk(rks, "DONE")
    return NextResponse.json({
      downloadUrl: result.downloadUrl,
      resultKey: result.resultKey,
    })
  } catch (e) {
    if (rks.length > 0) await updateFileStatusBulk(rks, "ERROR")
    const message = e instanceof Error ? e.message : "合并处理失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
