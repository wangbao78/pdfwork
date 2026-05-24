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

export interface PageNumberOptions {
  position: string    // bottom-center, top-right, etc.
  fontSize?: number
  color?: [number, number, number]
}

export async function addPageNumbers(
  r2Key: string,
  options: PageNumberOptions,
): Promise<string> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)

  const fileId = r2Key.split("/")[1]
  const buf = await readFile(join(LOCAL_DIR, "uploads", fileId))
  await writeFile(inputPath, buf)

  const script = join(process.cwd(), "scripts", "page_number.py")
  const python = findPython()
  if (!python) throw new Error("Python 不可用")

  const opts = JSON.stringify({
    position: options.position,
    fontSize: options.fontSize || 10,
    color: options.color || [0, 0, 0],
  })

  const cmd = `${python} "${script}" "${inputPath}" '${opts}'`

  try {
    const { stdout } = await execP(cmd, { timeout: 120_000 })
    const match = stdout.match(/OK:(.+)/)
    if (!match) throw new Error("页码添加失败")
    const resultFilePath = match[1].trim()
    const resultBuf = await readFile(resultFilePath)

    const resultName = `numbered-${inputName}`
    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, resultName)
    await writeFile(resultPath, resultBuf)

    return `/api/download?file=${encodeURIComponent(resultPath)}`
  } finally {
    unlink(inputPath).catch(() => {})
  }
}
