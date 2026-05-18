import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-32 text-center">
      <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold">页面不存在</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        你访问的页面不存在或已被移除
      </p>
      <Link href="/">
        <Button className="mt-6">返回首页</Button>
      </Link>
    </div>
  )
}
