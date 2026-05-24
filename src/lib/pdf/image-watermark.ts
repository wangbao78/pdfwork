import { exec } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, mkdir, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { existsSync } from "fs"

const execP = promisify(exec)

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

function findPython(): string | null {
  if (existsSync("/usr/bin/python3")) return "python3"
  return null
}

export async function imageWatermarkPdf(
  r2Key: string,
  watermarkBuf: Buffer,
  watermarkExt: string,
  options: { opacity?: number; scale?: number },
): Promise<string> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)
  const wmPath = join(tmpDir, `wm.${watermarkExt}`)

  const fileId = r2Key.split("/")[1]
  const buf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  await writeFile(inputPath, buf)
  await writeFile(wmPath, watermarkBuf)

  const script = join(process.cwd(), "scripts", "image_watermark.py")
  const python = findPython()
  if (!python) throw new Error("Python 不可用")

  const opts = JSON.stringify({
    opacity: options.opacity ?? 0.3,
    scale: options.scale ?? 0.25,
  })

  const cmd = `${python} "${script}" "${inputPath}" "${wmPath}" '${opts}'`

  try {
    const { stdout } = await execP(cmd, { timeout: 120_000 })
    const match = stdout.match(/OK:(.+)/)
    if (!match) throw new Error("水印生成失败")
    const resultFilePath = match[1].trim()
    const resultBuf = await readFile(resultFilePath)

    const resultName = `wm-${inputName}`
    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, resultName)
    await writeFile(resultPath, resultBuf)

    return `/api/download?file=${encodeURIComponent(resultPath)}`
  } finally {
    unlink(inputPath).catch(() => {})
    unlink(wmPath).catch(() => {})
  }
}
