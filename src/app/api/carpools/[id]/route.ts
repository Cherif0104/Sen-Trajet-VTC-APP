import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { bookCarpool, cancelBooking, cancelCarpoolTrip, getCarpool } from "@/server/services"

type CarpoolRoute = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: CarpoolRoute) {
  return handle(async () => getCarpool((await context.params).id, await requireUserId()))
}

export async function POST(request: Request, context: CarpoolRoute) {
  return handle(async () => {
    const { id } = await context.params
    const userId = await requireUserId()
    const body = (await request.json()) as { action?: string; seats?: number; method?: string }
    if (body.action === "book") {
      return bookCarpool({ riderId: userId, carpoolId: id, seats: body.seats ?? 1, method: body.method ?? "" })
    }
    if (body.action === "cancel-booking") return cancelBooking(userId, id)
    if (body.action === "cancel-trip") return cancelCarpoolTrip(userId, id)
    throw new (await import("@/server/http")).ApiError("Action inconnue.")
  })
}
