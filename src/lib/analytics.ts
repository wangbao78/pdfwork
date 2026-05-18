// Analytics event tracking — stub implementation
// Replace with Plausible, Umami, or custom backend

type EventName =
  | "page_view"
  | "upload_start"
  | "upload_complete"
  | "convert_start"
  | "convert_complete"
  | "convert_error"
  | "merge_start"
  | "merge_complete"
  | "compress_start"
  | "compress_complete"
  | "upgrade_click"
  | "register_complete"

interface EventProps {
  tool?: string
  fileSize?: number
  error?: string
  duration?: number
}

export function track(name: EventName, props?: EventProps): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[analytics] ${name}`, props || "")
    return
  }
  // TODO: Send to analytics backend
}
