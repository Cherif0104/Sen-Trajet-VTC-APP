import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { actOnRide, syncRide } from "@/server/services"

type RideRoute = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RideRoute) {
  return handle(async () => {
    const { id } = await context.params
    return syncRide(id, await requireUserId())
  })
}

export async function POST(request: Request, context: RideRoute) {
  return handle(async () => {
    const { id } = await context.params
    const body = (await request.json()) as { action?: string; rating?: number; comment?: string }
    return actOnRide(await requireUserId(), id, body.action ?? "", {
      rating: body.rating,
      comment: body.comment,
    })
  })
}
