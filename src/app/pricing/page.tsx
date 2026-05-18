import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Free",
    price: "免费",
    period: "",
    features: [
      { text: "每日 3 次处理", ok: true },
      { text: "文件 ≤ 5MB", ok: true },
      { text: "最多 50 页", ok: true },
      { text: "PDF 转 Word", ok: true },
      { text: "合并 PDF", ok: true },
      { text: "压缩 PDF（标准）", ok: true },
      { text: "批量处理", ok: false },
      { text: "OCR 识别", ok: false },
      { text: "优先处理队列", ok: false },
      { text: "极限压缩", ok: false },
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
      { text: "不限处理次数", ok: true },
      { text: "文件 ≤ 100MB", ok: true },
      { text: "最多 200 页", ok: true },
      { text: "PDF 转 Word", ok: true },
      { text: "合并 PDF", ok: true },
      { text: "压缩 PDF（全部级别）", ok: true },
      { text: "批量处理", ok: true },
      { text: "OCR 识别", ok: true },
      { text: "优先处理队列", ok: true },
      { text: "极限压缩", ok: true },
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
            <ul className="mt-8 space-y-3">
              {plan.features.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  {f.ok ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={f.ok ? "" : "text-muted-foreground/50"}>
                    {f.text}
                  </span>
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
