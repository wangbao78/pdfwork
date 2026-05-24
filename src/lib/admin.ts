import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export interface AdminUser {
  id: string
  name?: string | null
  email?: string | null
}

export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) redirect("/")

  const user = session.user as { id: string; name?: string | null; email?: string | null }
  if (user.email !== adminEmail) {
    throw new Error("FORBIDDEN")
  }

  return { id: user.id, name: user.name, email: user.email }
}
