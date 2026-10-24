import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { topup } from "@/server/services"

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as { amount?: number; method?: string }
    return topup(await requireUserId(), Number(body.amount), body.method ?? "")
  })
}
