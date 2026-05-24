"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, X } from "lucide-react"

export function UpgradedBanner() {
  const sp = useSearchParams()
  const [visible, setVisible] = useState(sp.get("upgraded") === "true")

  if (!visible) return null

  return (
    <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-emerald-800">
        <Check className="h-4 w-4 text-emerald-600" />
        升级成功！你现在是 Pro 用户，全部 18 个工具不限使用。
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-emerald-500 hover:text-emerald-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
