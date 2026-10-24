import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { becomeDriver } from "@/server/services"

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as {
      category?: string
      make?: string
      model?: string
      color?: string
      plate?: string
      serene?: boolean
    }
    return becomeDriver(await requireUserId(), {
      category: body.category ?? "",
      make: body.make ?? "",
      model: body.model ?? "",
      color: body.color ?? "",
      plate: body.plate ?? "",
      serene: Boolean(body.serene),
    })
  })
}
