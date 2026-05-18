import { NextResponse } from "next/server"

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export function apiOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

// Simple in-memory rate limiter (cleared on server restart)
const rateMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now()
  const entry = rateMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) return false

  entry.count++
  return true
}
