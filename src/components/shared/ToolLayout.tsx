import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface Props {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function ToolLayout({ title, description, children, className }: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl px-4 py-12", className)}>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  )
}
