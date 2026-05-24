import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Free",
    price: "免费",
    period: "",
    features: [
      { text: "文件 ≤ 10MB，50 页", ok: true },
      { text: "PDF 转 Word / JPG / 提取图片", ok: true },
      { text: "图片转 PDF", ok: true },
      { text: "合并 / 拆分 / 旋转 / 排序", ok: true },
      { text: "压缩 PDF（标准 / 高）", ok: true },
      { text: "PDF 加水印（文字/图片）", ok: true },
      { text: "HTML 转 PDF / PDF 页码", ok: true },
      { text: "Office 转 PDF", ok: false },
      { text: "加密 / 解锁", ok: false },
      { text: "极限压缩", ok: false },
      { text: "图片水印", ok: false },
      { text: "批量处理", ok: true },
      { text: "OCR 识别", ok: false },
    ],
    cta: "当前套餐",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro",
    price: "¥9.9",
    period: "/月",
    featured: true,
    features: [
      { text: "文件 ≤ 100MB，200 页", ok: true },
      { text: "PDF 转 Word / JPG / 提取图片", ok: true },
      { text: "图片转 PDF", ok: true },
      { text: "合并 / 拆分 / 旋转 / 排序", ok: true },
      { text: "压缩 PDF（含极限）", ok: true },
      { text: "PDF 加水印（文字/图片）", ok: true },
      { text: "Office 转 PDF", ok: true },
      { text: "HTML 转 PDF / PDF 页码", ok: true },
      { text: "加密 / 解锁", ok: true },
      { text: "极限压缩", ok: true },
      { text: "图片水印", ok: true },
      { text: "批量处理", ok: true },
      { text: "OCR 识别", ok: true, soon: true },
    ],
    cta: "升级 Pro",
    ctaVariant: "default" as const,
  },
]

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">定价</h1>
        <p className="mt-2 text-muted-foreground">
          选择适合你的方案，随时升级或取消
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl border p-8 ${
              plan.featured
                ? "border-primary shadow-lg ring-1 ring-primary"
                : ""
            }`}
          >
            {plan.featured && (
              <span className="inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground mb-4">
                推荐
              </span>
            )}
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="mt-8 space-y-2.5">
              {plan.features.map((f: any) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  {f.ok ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={f.ok ? "" : "text-muted-foreground/50"}>
                    {f.text}
                  </span>
                  {f.soon && (
                    <span className="ml-auto rounded-full bg-amber-100 dark:bg-amber-900 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                      即将推出
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.ctaVariant}
              className="mt-8 w-full"
              disabled={plan.cta === "当前套餐"}
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
