import Link from "next/link"
import {
  FileType, Combine, Shrink, Droplets, Scissors, Image,
  ImageUp, Images, RotateCw, FileText, Lock, ArrowRight,
  Layers, ScanText, Code2, Stamp, FileDigit,
} from "lucide-react"

interface Tool {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  bgLight: string
  iconColor: string
  soon?: boolean
}

const convertTools: Tool[] = [
  {
    href: "/tools/pdf-to-word", icon: FileType,
    title: "PDF 转 Word", desc: "将 PDF 转换为可编辑的 Word 文件。",
    bgLight: "bg-blue-50 dark:bg-blue-950", iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    href: "/tools/pdf-to-jpg", icon: Images,
    title: "PDF 转 JPG", desc: "将 PDF 每页转为 JPG 图片，200 DPI。",
    bgLight: "bg-cyan-50 dark:bg-cyan-950", iconColor: "text-cyan-600 dark:text-cyan-400",
  },
  {
    href: "/tools/extract-images", icon: Image,
    title: "提取图片", desc: "从 PDF 中提取所有内嵌图片。",
    bgLight: "bg-sky-50 dark:bg-sky-950", iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    href: "/tools/image-to-pdf", icon: ImageUp,
    title: "图片转 PDF", desc: "将多张图片合成为 PDF 文件。",
    bgLight: "bg-teal-50 dark:bg-teal-950", iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    href: "/tools/office-to-pdf", icon: FileText,
    title: "Office 转 PDF", desc: "Word、Excel、PPT 转 PDF。",
    bgLight: "bg-indigo-50 dark:bg-indigo-950", iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    href: "/tools/html-to-pdf", icon: Code2,
    title: "HTML 转 PDF", desc: "将 HTML 网页内容转为 PDF。",
    bgLight: "bg-purple-50 dark:bg-purple-950", iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    href: "/tools/batch", icon: Layers,
    title: "批量处理", desc: "一次上传多个 PDF，统一操作打包下载。",
    bgLight: "bg-gray-50 dark:bg-gray-900", iconColor: "text-gray-600 dark:text-gray-400",
  },
]

const editTools: Tool[] = [
  {
    href: "/tools/merge-pdf", icon: Combine,
    title: "合并 PDF", desc: "将多个 PDF 合并为一个文档。",
    bgLight: "bg-violet-50 dark:bg-violet-950", iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    href: "/tools/split-pdf", icon: Scissors,
    title: "拆分 PDF", desc: "从 PDF 中抽取指定页面。",
    bgLight: "bg-rose-50 dark:bg-rose-950", iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    href: "/tools/rotate-pdf", icon: RotateCw,
    title: "旋转 PDF", desc: "将 PDF 页面按 90°/180°/270° 旋转。",
    bgLight: "bg-fuchsia-50 dark:bg-fuchsia-950", iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    href: "/tools/reorder-pdf", icon: ArrowRight,
    title: "页面排序", desc: "拖拽调整 PDF 页面顺序。",
    bgLight: "bg-amber-50 dark:bg-amber-950", iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    href: "/tools/page-number", icon: FileDigit,
    title: "PDF 页码", desc: "在 PDF 每页添加页码，多种位置。",
    bgLight: "bg-lime-50 dark:bg-lime-950", iconColor: "text-lime-600 dark:text-lime-400",
  },
]

const optimizeTools: Tool[] = [
  {
    href: "/tools/compress-pdf", icon: Shrink,
    title: "压缩 PDF", desc: "减小 PDF 文件体积，三级压缩。",
    bgLight: "bg-emerald-50 dark:bg-emerald-950", iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/tools/watermark", icon: Droplets,
    title: "PDF 加水印", desc: "给 PDF 添加文字水印。",
    bgLight: "bg-orange-50 dark:bg-orange-950", iconColor: "text-orange-600 dark:text-orange-400",
  },
  {
    href: "/tools/image-watermark", icon: Stamp,
    title: "图片水印", desc: "上传图片作为水印叠加到 PDF。",
    bgLight: "bg-yellow-50 dark:bg-yellow-950", iconColor: "text-yellow-600 dark:text-yellow-400",
  },
  {
    href: "/tools/protect-pdf", icon: Lock,
    title: "加密 / 解锁", desc: "给 PDF 加打开密码或解除保护。",
    bgLight: "bg-red-50 dark:bg-red-950", iconColor: "text-red-600 dark:text-red-400",
  },
]

const advancedTools: Tool[] = [
  {
    href: "/pricing", icon: ScanText,
    title: "OCR 识别", desc: "扫描件中的文字转为可编辑文本。",
    bgLight: "bg-slate-100 dark:bg-slate-800", iconColor: "text-slate-400 dark:text-slate-500",
    soon: true,
  },
]

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon
  return (
    <Link
      href={tool.href}
      className={`group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
        tool.soon ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${tool.bgLight}`}>
        <Icon className={`h-5 w-5 ${tool.iconColor}`} />
      </div>
      <h3 className="mt-3 text-sm font-semibold">{tool.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
      {tool.soon && (
        <span className="absolute top-2 right-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Pro
        </span>
      )}
    </Link>
  )
}

export default function Home() {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 pb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">PDF 工具箱</h1>
        <p className="mt-3 text-muted-foreground">17 个工具，免费在线处理 PDF — 转换、编辑、优化、标记</p>
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span>文件 ≤ 10MB</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <span>最多 50 页</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <span>全部基础工具免费</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
          <Link href="/pricing" className="text-primary hover:underline font-medium">Pro 更多 →</Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 space-y-10">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            转换
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {convertTools.map((t) => <ToolCard key={t.href} tool={t} />)}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            编辑
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {editTools.map((t) => <ToolCard key={t.href} tool={t} />)}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            优化与安全
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {optimizeTools.map((t) => <ToolCard key={t.href} tool={t} />)}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            高级
            <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Pro</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {advancedTools.map((t) => <ToolCard key={t.href} tool={t} />)}
          </div>
        </div>
      </section>
    </>
  )
}
