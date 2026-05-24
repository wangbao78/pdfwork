import { db } from "@/lib/db"

export async function updateFileStatus(
  r2Key: string,
  status: "PROCESSING" | "DONE" | "ERROR",
): Promise<void> {
  try {
    await db.file.updateMany({ where: { r2Key }, data: { status } })
  } catch {
    // DB 不可用，忽略
  }
}

export async function updateFileStatusBulk(
  r2Keys: string[],
  status: "PROCESSING" | "DONE" | "ERROR",
): Promise<void> {
  if (r2Keys.length === 0) return
  try {
    await db.file.updateMany({
      where: { r2Key: { in: r2Keys } },
      data: { status },
    })
  } catch {
    // DB 不可用，忽略
  }
}
