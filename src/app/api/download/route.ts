import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { basename } from "path"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const file = searchParams.get("file")

  if (!file) {
    return NextResponse.json({ error: "缺少文件路径" }, { status: 400 })
  }

  // Security: only allow paths under .data/
  if (file.includes("..") || !file.includes(".data")) {
    return NextResponse.json({ error: "无效的文件路径" }, { status: 403 })
  }

  try {
    const buf = await readFile(file)
    const name = basename(file)
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
        "Content-Length": String(buf.length),
      },
    })
  } catch {
    return NextResponse.json({ error: "文件不存在或已过期" }, { status: 404 })
  }
}
