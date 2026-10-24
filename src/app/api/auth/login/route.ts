import { handle } from "@/server/http"
import { setSession } from "@/server/session"
import { login } from "@/server/services"

const attempts = new Map<string, { count: number; at: number }>()

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as { email?: string; password?: string }
    const email = (body.email ?? "").trim().toLowerCase()
    const current = attempts.get(email)
    if (current && Date.now() - current.at < 10 * 60 * 1000 && current.count >= 8) {
      throw new (await import("@/server/http")).ApiError(
        "Trop de tentatives. Réessayez dans quelques minutes.",
        429,
      )
    }
    try {
      const userId = await login(email, body.password ?? "")
      attempts.delete(email)
      await setSession(userId)
      return { ok: true }
    } catch (error) {
      const record = attempts.get(email)
      attempts.set(email, {
        count: record && Date.now() - record.at < 10 * 60 * 1000 ? record.count + 1 : 1,
        at: Date.now(),
      })
      throw error
    }
  })
}
