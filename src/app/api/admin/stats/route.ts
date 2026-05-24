import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const [totalUsers, freeUsers, proUsers, totalFiles, recentUsers] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { plan: "FREE" } }),
        db.user.count({ where: { plan: "PRO" } }),
        db.file.count(),
        db.user.findMany({
          select: { email: true, plan: true, createdAt: true, totalUsage: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ])

    return NextResponse.json({
      users: { total: totalUsers, free: freeUsers, pro: proUsers },
      files: { total: totalFiles },
      recentUsers: recentUsers.map((u) => ({
        email: u.email,
        plan: u.plan,
        createdAt: u.createdAt,
        usage: u.totalUsage,
      })),
    })
  } catch {
    return NextResponse.json({ error: "数据库不可用" }, { status: 500 })
  }
}
