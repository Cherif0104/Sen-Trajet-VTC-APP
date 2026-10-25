import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { getMe, markNotificationsRead, updateProfile, updateSpace } from "@/server/services"
import type { ClientFeatures } from "@/lib/domain"
import type { GeoPoint } from "@/lib/places"

export async function GET() {
  return handle(async () => getMe(await requireUserId()))
}

export async function PATCH(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as {
      name?: string
      phone?: string
      accountType?: string
      companyName?: string
      features?: ClientFeatures
      places?: GeoPoint[]
    }
    const userId = await requireUserId()
    if (body.accountType || body.features || body.places) {
      return updateSpace(userId, body)
    }
    return updateProfile(userId, { name: body.name ?? "", phone: body.phone ?? "" })
  })
}

export async function DELETE() {
  return handle(async () => {
    await markNotificationsRead(await requireUserId())
    return { ok: true }
  })
}
