import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { createRide, listRides } from "@/server/services"

export async function GET() {
  return handle(async () => ({ rides: await listRides(await requireUserId()) }))
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as {
      pickup?: unknown
      dropoff?: unknown
      category?: string
      method?: string
      serene?: boolean
    }
    return createRide({
      riderId: await requireUserId(),
      pickup: body.pickup,
      dropoff: body.dropoff,
      category: body.category ?? "",
      method: body.method ?? "",
      serene: Boolean(body.serene),
    })
  })
}
