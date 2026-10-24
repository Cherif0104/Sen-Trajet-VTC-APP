export type Sql = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>
}

export function num(value: unknown) {
  return Number(value ?? 0)
}

export function text(value: unknown) {
  return value == null ? "" : String(value)
}

export function iso(value: unknown) {
  if (!value) return null
  const date = new Date(value as string | Date)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function flag(value: unknown) {
  return value === true || value === "t" || value === "true" || value === 1
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value !== "string") return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
