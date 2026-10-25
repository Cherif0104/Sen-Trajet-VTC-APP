import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { adminAct, adminDesk } from "@/server/services"

export async function GET() {
  return handle(async () => adminDesk(await requireUserId()))
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as {
      action?: string
      userId?: string
      tariff?: unknown
      reason?: string
      amount?: number
    }
    return adminAct(await requireUserId(), body.action ?? "", body.userId ?? "", {
      tariff: body.tariff,
      reason: body.reason,
      amount: body.amount,
    })
  })
}
