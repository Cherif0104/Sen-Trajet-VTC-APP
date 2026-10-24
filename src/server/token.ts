import { createHmac, timingSafeEqual } from "node:crypto"

const secret = () => process.env.AUTH_SECRET || "yoon-preprod-change-me"

export function signSession(userId: string) {
  const body = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + 30 * 24 * 3600 * 1000 }),
  ).toString("base64url")
  const signature = createHmac("sha256", secret()).update(body).digest("base64url")
  return `${body}.${signature}`
}

export function readSession(token: string | undefined | null) {
  if (!token) return null
  const [body, signature] = token.split(".")
  if (!body || !signature) return null
  const expected = createHmac("sha256", secret()).update(body).digest("base64url")
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      uid?: string
      exp?: number
    }
    if (!payload.uid || !payload.exp || payload.exp < Date.now()) return null
    return payload.uid
  } catch {
    return null
  }
}
