import { execFile } from "child_process"
import { promisify } from "util"
import { readFile, writeFile, mkdir, unlink } from "fs/promises"
import { tmpdir } from "os"
import { join, basename } from "path"
import { getDownloadUrl, getUploadUrl } from "@/lib/r2"
import type { ConversionResult } from "./types"

const execFileP = promisify(execFile)

const isR2Configured =
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your-account")

const LOCAL_DIR = join(process.cwd(), ".data")
const LOCAL_RESULTS = join(LOCAL_DIR, "results")

function getFileBuf(r2Key: string): Promise<Buffer> {
  const fileId = r2Key.split("/")[1]
  return readFile(join(LOCAL_DIR, "uploads", fileId))
}

export async function protectPdf(
  r2Key: string,
  password: string,
): Promise<ConversionResult> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)
  const outputName = inputName.replace(/\.pdf$/i, "_protected.pdf")
  const outputPath = join(tmpDir, outputName)

  await writeFile(inputPath, await getFileBuf(r2Key))

  try {
    const args = [
      "-sDEVICE=pdfwrite",
      `-sOwnerPassword=${password}`,
      `-sUserPassword=${password}`,
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]
    await execFileP("gs", ["-dBATCH", "-dNOPAUSE", "-dSAFER", ...args], { timeout: 120_000 })

    const resultBuf = await readFile(outputPath)
    const resultName = `protected-${inputName}`

    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, resultName)
    await writeFile(resultPath, resultBuf)
    return {
      resultKey: `results/protected/${resultName}`,
      downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
    }
  } finally {
    unlink(inputPath).catch(() => {})
    unlink(outputPath).catch(() => {})
  }
}

export async function unlockPdf(
  r2Key: string,
  password: string,
): Promise<ConversionResult> {
  const inputName = basename(r2Key)
  const tmpDir = tmpdir()
  const inputPath = join(tmpDir, inputName)
  const outputName = inputName.replace(/\.pdf$/i, "_unlocked.pdf")
  const outputPath = join(tmpDir, outputName)

  await writeFile(inputPath, await getFileBuf(r2Key))

  try {
    const args = [
      `-sPDFPassword=${password}`,
      "-sDEVICE=pdfwrite",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]
    await execFileP("gs", ["-dBATCH", "-dNOPAUSE", "-dSAFER", ...args], { timeout: 120_000 })

    const resultBuf = await readFile(outputPath)
    const resultName = `unlocked-${inputName}`

    await mkdir(LOCAL_RESULTS, { recursive: true })
    const resultPath = join(LOCAL_RESULTS, resultName)
    await writeFile(resultPath, resultBuf)
    return {
      resultKey: `results/unlocked/${resultName}`,
      downloadUrl: `/api/download?file=${encodeURIComponent(resultPath)}`,
    }
  } finally {
    unlink(inputPath).catch(() => {})
    unlink(outputPath).catch(() => {})
  }
}
