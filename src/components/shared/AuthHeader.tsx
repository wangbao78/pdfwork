"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, User, LogOut, Sun, Moon } from "lucide-react"
import { useEffect, useState } from "react"

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  if (!mounted) return <div className="h-8 w-8" />

  return (
    <button
      onClick={toggle}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label="切换主题"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function AuthHeader() {
  const { data: session, status } = useSession()

  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      {status === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
      ) : session?.user ? (
        <div className="flex items-center gap-2 ml-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
          </Link>
          <Button variant="outline" size="xs" onClick={() => signOut()}>
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">退出</span>
          </Button>
        </div>
      ) : (
        <Link
          href="/auth/login"
          className="ml-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          登录
        </Link>
      )}
    </div>
  )
}
