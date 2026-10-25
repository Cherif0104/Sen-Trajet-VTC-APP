import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { becomeDriver, driverProfile, saveDriverDocument, submitDriver } from "@/server/services"

export async function GET() {
  return handle(async () => driverProfile(await requireUserId()))
}

export async function POST(request: Request) {
  return handle(async () => {
    const userId = await requireUserId()
    const body = (await request.json()) as {
      action?: string
      kind?: string
      dataUrl?: string
      category?: string
      make?: string
      model?: string
      color?: string
      plate?: string
      serene?: boolean
      year?: number
      licenseNumber?: string
      licenseExpiry?: string
    }
    if (body.action === "document") return saveDriverDocument(userId, body.kind ?? "", body.dataUrl ?? "")
    if (body.action === "submit") return submitDriver(userId)
    return becomeDriver(userId, {
      category: body.category ?? "",
      make: body.make ?? "",
      model: body.model ?? "",
      color: body.color ?? "",
      plate: body.plate ?? "",
      serene: Boolean(body.serene),
      year: body.year,
      licenseNumber: body.licenseNumber,
      licenseExpiry: body.licenseExpiry,
    })
  })
}
