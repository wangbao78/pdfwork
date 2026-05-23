import { unlink, readdir, stat } from "fs/promises"
import { join } from "path"

const LOCAL_DIR = join(process.cwd(), ".data")
const UPLOADS = join(LOCAL_DIR, "uploads")
const RESULTS = join(LOCAL_DIR, "results")

const TTL_MS = 3600 * 1000 // 1 小时

/** 安排 1 小时后清理指定路径 */
export function scheduleCleanup(sourcePath: string, resultPath: string): void {
  setTimeout(async () => {
    await unlink(sourcePath).catch(() => {})
    await unlink(resultPath).catch(() => {})
  }, TTL_MS)
}

/** 扫一遍目录，清理超过 1 小时的旧文件 */
export async function cleanupOld(): Promise<void> {
  for (const dir of [UPLOADS, RESULTS]) {
    let entries: string[] = []
    try {
      entries = await readdir(dir)
    } catch {
      continue
    }
    const now = Date.now()
    for (const name of entries) {
      const p = join(dir, name)
      try {
        const s = await stat(p)
        if (now - s.mtimeMs > TTL_MS) {
          await unlink(p).catch(() => {})
        }
      } catch {
        // 文件可能已被删
      }
    }
  }
}
