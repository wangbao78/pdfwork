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

export interface BatchOptions {
  operation: "convert" | "compress" | "watermark"
  watermarkText?: string
  compressLevel?: "standard" | "high"
}

export async function batchProcess(
  r2Keys: string[],
  options: BatchOptions,
): Promise<{ downloadUrl: string; total: number; ok: number; failed: number }> {
  const tmpDir = tmpdir()
  const inputDir = join(tmpDir, "inputs")
  const outputDir = join(tmpDir, "outputs")
  await mkdir(inputDir, { recursive: true })
  await mkdir(outputDir, { recursive: true })

  const files: { path: string; name: string }[] = []

  for (const key of r2Keys) {
    const fileId = key.split("/")[1]
    const srcPath = join(LOCAL_DIR, "uploads", fileId)
    const name = basename(key)
    const destPath = join(inputDir, name)
    // Copy to input dir
    const buf = await readFile(srcPath)
    await writeFile(destPath, buf)
    files.push({ path: destPath, name })
  }

  const script = join(process.cwd(), "scripts", "batch_process.py")
  const python = findPython()
  if (!python) throw new Error("Python 不可用")

  const inputJson = JSON.stringify({
    operation: options.operation,
    files,
    watermarkText: options.watermarkText || "机密",
    compressLevel: options.compressLevel || "standard",
  })

  // Write JSON to file to avoid shell escaping issues
  const jsonPath = join(tmpDir, "input.json")
  await writeFile(jsonPath, inputJson, "utf-8")

  try {
    const cmd = `${python} "${script}" "${jsonPath}" "${outputDir}"`
    const { stdout } = await execP(cmd, { timeout: 300_000 })

    const data = JSON.parse(stdout.trim())
    const zipPath = data.zip

    if (!existsSync(zipPath)) throw new Error("打包结果失败")

    const zipBuf = await readFile(zipPath)
    const resultName = `batch-${Date.now().toString(36)}.zip`
    await mkdir(LOCAL_RESULTS, { recursive: true })
    const destPath = join(LOCAL_RESULTS, resultName)
    await writeFile(destPath, zipBuf)

    return {
      downloadUrl: `/api/download?file=${encodeURIComponent(destPath)}`,
      total: r2Keys.length,
      ok: data.results.filter((r: any) => r.ok).length,
      failed: data.results.filter((r: any) => !r.ok).length,
    }
  } finally {
    // Cleanup
    for (const f of files) {
      unlink(f.path).catch(() => {})
    }
    unlink(jsonPath).catch(() => {})
  }
}
