import { exec } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, mkdir, unlink, readdir } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { existsSync } from "fs"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"

const execP = promisify(exec)

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")

export interface ImageInfo {
  page: number
  index: number
  filename: string
  width: number
  height: number
  size: number
  format: string
  downloadUrl?: string
}

function findPython(): string | null {
  if (existsSync("/usr/bin/python3")) return "python3"
  return null
}

export async function extractImages(r2Key: string): Promise<ImageInfo[]> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)
  const outputDir = join(tmpDir, "images")

  // Get source file
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
    const script = join(process.cwd(), "scripts", "extract_images.py")
    const python = findPython()
    if (!python) throw new Error("Python 不可用")

    const cmd = `${python} "${script}" "${inputPath}" "${outputDir}"`

    const { stdout, stderr } = await execP(cmd, { timeout: 120_000 })
    if (stderr && stderr.includes("Error")) throw new Error(stderr)

    const images: ImageInfo[] = JSON.parse(stdout.trim() || "[]")

    if (images.length === 0) throw new Error("PDF 中没有可提取的图片")

    // Generate download URLs for each image
    const fileId = r2Key.split("/")[1]
    const resultsDir = join(LOCAL_DIR, "results", `images-${fileId}`)
    await mkdir(resultsDir, { recursive: true })

    for (const img of images) {
      const imgPath = join(outputDir, img.filename)
      const destPath = join(resultsDir, img.filename)

      if (isR2Configured) {
        const imgBuf = await readFile(imgPath)
        const r2ImgKey = `images/${fileId}/${img.filename}`
        const uploadUrl = await getUploadUrl(r2ImgKey)
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: new Uint8Array(imgBuf),
        })
        if (!uploadRes.ok) throw new Error(`上传图片失败: ${uploadRes.status}`)
        img.downloadUrl = await getDownloadUrl(r2ImgKey)
      } else {
        // Copy to results dir for local download
        const imgBuf = await readFile(imgPath)
        await writeFile(destPath, imgBuf)
        img.downloadUrl = `/api/download?file=${encodeURIComponent(destPath)}`
      }
    }

    return images
  } finally {
    unlink(inputPath).catch(() => {})
  }
}
