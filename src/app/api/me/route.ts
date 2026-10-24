import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { getMe, markNotificationsRead, updateProfile } from "@/server/services"

export async function GET() {
  return handle(async () => getMe(await requireUserId()))
}

export async function PATCH(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as { name?: string; phone?: string }
    return updateProfile(await requireUserId(), { name: body.name ?? "", phone: body.phone ?? "" })
  })
}

export async function DELETE() {
  return handle(async () => {
    await markNotificationsRead(await requireUserId())
    return { ok: true }
  })
}
