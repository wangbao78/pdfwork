import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import { FileText } from "lucide-react"
import { Providers } from "@/components/shared/Providers"
import { AuthHeader } from "@/components/shared/AuthHeader"
import { ThemeInit } from "@/components/shared/ThemeInit"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "PDF 工具箱 — 在线 PDF 处理",
  description: "免费在线处理 PDF 文件 — 转换、合并、压缩，简单高效",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <ThemeInit />
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <FileText className="h-5 w-5 text-primary" />
                PDF 工具箱
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/#tools" className="text-muted-foreground hover:text-foreground transition-colors">
                  工具
                </Link>
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  定价
                </Link>
                <AuthHeader />
              </nav>
            </div>
          </header>
          {children}
          <footer className="mt-auto border-t">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground">
              <span>PDF 工具箱</span>
              <span>文件处理后 1 小时自动删除</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
