import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { driverAct, driverDesk } from "@/server/services"

export async function GET() {
  return handle(async () => driverDesk(await requireUserId()))
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as {
      action?: string
      lat?: number
      lng?: number
      rating?: number
    }
    return driverAct(await requireUserId(), body.action ?? "", body)
  })
}
