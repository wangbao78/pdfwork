import { exec } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, mkdir, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import type { ConversionResult } from "./types"

const execP = promisify(exec)

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

const ALLOWED_EXT = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]

export async function officeToPdf(filePath: string, fileName: string): Promise<ConversionResult & { originalName: string }> {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."))
  if (!ALLOWED_EXT.includes(ext)) {
    throw new Error("仅支持 Word、Excel、PPT 文件")
  }

  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, fileName)
  await writeFile(inputPath, await readFile(filePath))

  const baseName = basename(fileName, ext)
  const outputPath = join(tmpDir, `${baseName}.pdf`)

  try {
    const cmd = `soffice --headless --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`
    const { stderr } = await execP(cmd, { timeout: 120_000 })
    if (stderr && !stderr.includes("Warning")) throw new Error(stderr)

    const buf = await readFile(outputPath)
    if (buf.length === 0) throw new Error("转换结果为空")

    const resultName = `${baseName}.pdf`
    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, `office-${resultName}`)
    await writeFile(resultPath, buf)

    return {
      resultKey: `results/office/${resultName}`,
      downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
      originalName: resultName,
    }
  } catch (e: any) {
    const msg = (e.stderr || e.message || "").toString()
    if (msg.includes("command not found") || e.code === 127) {
      throw new Error("LibreOffice 未安装")
    }
    throw new Error(`转换失败: ${msg.slice(0, 200)}`)
  } finally {
    unlink(inputPath).catch(() => {})
    unlink(outputPath).catch(() => {})
  }
}
