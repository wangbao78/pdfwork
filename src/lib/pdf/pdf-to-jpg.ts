import { exec } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, mkdir, unlink, readdir } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { existsSync } from "fs"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ImageInfo } from "./extract-images"

const execP = promisify(exec)

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")

function findPython(): string | null {
  if (existsSync("/usr/bin/python3")) return "python3"
  return null
}

export async function pdfToJpg(r2Key: string): Promise<ImageInfo[]> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)
  const outputDir = join(tmpDir, "jpgs")

  if (isR2Configured) {
    const downloadUrl = await getDownloadUrl(r2Key)
    const res = await fetch(downloadUrl)
    if (!res.ok) throw new Error(`下载源文件失败: ${res.status}`)
    await writeFile(inputPath, Buffer.from(await res.arrayBuffer()))
  } else {
    const fileId = r2Key.split("/")[1]
    const buf = await readFile(join(LOCAL_DIR, "uploads", fileId))
    await writeFile(inputPath, buf)
  }

  try {
    const script = join(process.cwd(), "scripts", "pdf_to_jpg.py")
    const python = findPython()
    if (!python) throw new Error("Python 不可用")

    const cmd = `${python} "${script}" "${inputPath}" "${outputDir}"`
    const { stdout } = await execP(cmd, { timeout: 120_000 })

    const images: ImageInfo[] = JSON.parse(stdout.trim() || "[]")
    if (images.length === 0) throw new Error("转换失败")

    const fileId = r2Key.split("/")[1]
    const resultsDir = join(LOCAL_DIR, "results", `jpgs-${fileId}`)
    await mkdir(resultsDir, { recursive: true })

    for (const img of images) {
      const srcPath = join(outputDir, img.filename)
      const destPath = join(resultsDir, img.filename)

      if (isR2Configured) {
        const imgBuf = await readFile(srcPath)
        const r2ImgKey = `jpgs/${fileId}/${img.filename}`
        const uploadUrl = await getUploadUrl(r2ImgKey)
        await fetch(uploadUrl, {
          method: "PUT",
          body: new Uint8Array(imgBuf),
        })
        img.downloadUrl = await getDownloadUrl(r2ImgKey)
      } else {
        await writeFile(destPath, await readFile(srcPath))
        img.downloadUrl = `/api/download?file=${encodeURIComponent(destPath)}`
      }
    }

    return images
  } finally {
    unlink(inputPath).catch(() => {})
  }
}
