import { handle } from "@/server/http"
import { setSession } from "@/server/session"
import { signup } from "@/server/services"

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as {
      name?: string
      email?: string
      phone?: string
      password?: string
    }
    const userId = await signup({
      name: body.name ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      password: body.password ?? "",
    })
    await setSession(userId)
    return { ok: true }
  })
}
