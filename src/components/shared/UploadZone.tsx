"use client"

import { useCallback, useRef, useState, type DragEvent } from "react"
import { Upload, FileIcon, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  onFile: (file: File) => void
  maxSize?: number // bytes, default 100MB
  disabled?: boolean
  className?: string
  multiple?: boolean
}

export function UploadZone({
  onFile,
  maxSize = 100 * 1024 * 1024,
  disabled = false,
  className,
  multiple = false,
}: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.type !== "application/pdf") {
        return "仅支持 PDF 文件"
      }
      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024))
        return `文件大小超过限制（最大 ${maxMB}MB）`
      }
      if (file.size === 0) {
        return "文件为空"
      }
      return null
    },
    [maxSize],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      setError(null)

      for (const file of Array.from(files)) {
        const err = validateFile(file)
        if (err) {
          setError(err)
          return
        }
        onFile(file)
      }
    },
    [validateFile, onFile],
  )

  const handleDrag = (e: DragEvent, over: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragOver(over)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onDragOver={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (!disabled) inputRef.current?.click()
          }
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all",
          dragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "cursor-pointer",
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
            dragOver ? "bg-primary/10" : "bg-muted",
          )}
        >
          <Upload
            className={cn(
              "h-6 w-6 transition-colors",
              dragOver ? "text-primary" : "text-muted-foreground",
            )}
          />
        </div>
        <p className="mt-4 text-sm font-medium">
          {dragOver ? "松开以上传文件" : "拖拽 PDF 文件到此处"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          或点击选择文件
          {multiple ? "（支持多选）" : ""}
        </p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          最大 {Math.round(maxSize / (1024 * 1024))}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto shrink-0 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export function FileCard({
  file,
  onRemove,
  index,
}: {
  file: File
  onRemove?: () => void
  index?: number
}) {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950">
        <FileIcon className="h-4 w-4 text-red-500" />
      </div>
      <div className="min-w-0 flex-1">
        {index !== undefined && (
          <span className="mr-1 text-xs text-muted-foreground">#{index + 1}</span>
        )}
        <span className="font-medium">{file.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{sizeMB} MB</span>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="shrink-0 rounded p-1 hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
