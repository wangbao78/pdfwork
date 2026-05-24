import { exec } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, mkdir, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"

const execP = promisify(exec)

const LOCAL_RESULTS = join(process.cwd(), ".data", "results")

export async function htmlToPdf(html: string): Promise<string> {
  const tmpDir = tmpdir()
  const htmlPath = join(tmpDir, "input.html")
  const outputPath = join(tmpDir, "output.pdf")

  await writeFile(htmlPath, html, "utf-8")

  try {
    const cmd = `wkhtmltopdf --encoding UTF-8 --quiet "${htmlPath}" "${outputPath}"`
    const { stderr } = await execP(cmd, { timeout: 120_000 })
    if (stderr && stderr.includes("Error")) throw new Error(stderr)

    const resultBuf = await readFile(outputPath)
    const resultName = `html-${Date.now().toString(36)}.pdf`
    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, resultName)
    await writeFile(resultPath, resultBuf)

    return `/api/download?file=${encodeURIComponent(resultPath)}`
  } catch (e: any) {
    const msg = (e.stderr || e.message || "").toString()
    throw new Error(`HTML 转 PDF 失败: ${msg.slice(0, 200)}`)
  } finally {
    unlink(htmlPath).catch(() => {})
    unlink(outputPath).catch(() => {})
  }
}
