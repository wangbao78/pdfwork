import { db } from "@/lib/db"

export async function updateFileStatus(
  r2Key: string,
  status: "PROCESSING" | "DONE" | "ERROR",
  tool?: string,
): Promise<void> {
  try {
    const data: Record<string, unknown> = { status }
    if (tool) data.tool = tool
    await db.file.updateMany({ where: { r2Key }, data })
  } catch {
    // DB 不可用，忽略
  }
}

export async function updateFileStatusBulk(
  r2Keys: string[],
  status: "PROCESSING" | "DONE" | "ERROR",
  tool?: string,
): Promise<void> {
  if (r2Keys.length === 0) return
  try {
    const data: Record<string, unknown> = { status }
    if (tool) data.tool = tool
    await db.file.updateMany({
      where: { r2Key: { in: r2Keys } },
      data,
    })
  } catch {
    // DB 不可用，忽略
  }
}
