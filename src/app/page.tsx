import Link from "next/link"
import { FileType, Combine, Shrink, Droplets, ArrowRight } from "lucide-react"

const tools = [
  {
    href: "/tools/pdf-to-word",
    icon: FileType,
    title: "PDF 转 Word",
    desc: "将 PDF 文档转换为可编辑的 Word 文件，保留原始排版格式。",
    gradient: "from-blue-500 to-cyan-500",
    bgLight: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    href: "/tools/merge-pdf",
    icon: Combine,
    title: "合并 PDF",
    desc: "将多个 PDF 文件按顺序合并为一个文档，支持拖拽排序。",
    gradient: "from-violet-500 to-purple-500",
    bgLight: "bg-violet-50 dark:bg-violet-950",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    href: "/tools/compress-pdf",
    icon: Shrink,
    title: "压缩 PDF",
    desc: "减小 PDF 文件体积，提供标准/高/极限三种压缩级别。",
    gradient: "from-emerald-500 to-green-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/tools/watermark",
    icon: Droplets,
    title: "PDF 加水印",
    desc: "给 PDF 页面添加文字水印，可自定义文字、大小、透明度。",
    gradient: "from-orange-500 to-amber-500",
    bgLight: "bg-orange-50 dark:bg-orange-950",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto w-full max-w-4xl px-4 pt-20 pb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          PDF 工具箱
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          免费在线处理 PDF 文件 — 转换、合并、压缩，简单高效
        </p>
      </section>

      {/* Tool Cards */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${tool.bgLight}`}
              >
                <tool.icon className={`h-5 w-5 ${tool.iconColor}`} />
              </div>
              <h3 className="mt-4 font-semibold">{tool.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {tool.desc}
              </p>
              <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                开始使用
                <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-20">
        <div className="rounded-xl border bg-muted/30 p-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold">3</div>
              <div className="mt-1 text-sm text-muted-foreground">次/天免费使用</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">5MB</div>
              <div className="mt-1 text-sm text-muted-foreground">免费文件大小上限</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">100MB</div>
              <div className="mt-1 text-sm text-muted-foreground">Pro 文件大小上限</div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/pricing"
              className="text-sm font-medium text-primary hover:underline"
            >
              查看完整定价 →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
