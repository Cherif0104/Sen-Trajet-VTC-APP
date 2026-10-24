import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { quoteTrip } from "@/server/services"

export async function POST(request: Request) {
  return handle(async () => {
    await requireUserId()
    const body = (await request.json()) as { pickup?: unknown; dropoff?: unknown }
    return quoteTrip(body.pickup, body.dropoff)
  })
}
