import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { imagesToPdf } from "@/lib/pdf/image-to-pdf"
import { cleanupOld } from "@/lib/cleanup"

const LOCAL_RESULTS = join(process.cwd(), ".data", "results")

export async function POST(req: Request) {
  cleanupOld()

  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "请选择图片" }, { status: 400 })
    }
    if (files.length > 30) {
      return NextResponse.json({ error: "最多 30 张图片" }, { status: 400 })
    }

    const buffers: Buffer[] = []
    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: "单张图片不超过 20MB" }, { status: 400 })
      }
      buffers.push(Buffer.from(await f.arrayBuffer()))
    }

    const resultBuf = await imagesToPdf(buffers)
    const resultName = `images-to-pdf-${Date.now().toString(36)}.pdf`

    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, resultName)
    await writeFile(resultPath, resultBuf)

    return NextResponse.json({
      downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
      resultKey: `results/images-to-pdf/${resultName}`,
      pageCount: files.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "转换失败"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
