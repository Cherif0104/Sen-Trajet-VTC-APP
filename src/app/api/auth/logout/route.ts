import { handle } from "@/server/http"
import { clearSession } from "@/server/session"

export async function POST() {
  return handle(async () => {
    await clearSession()
    return { ok: true }
  })
}
