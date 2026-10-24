import { handle } from "@/server/http"
import { requireUserId } from "@/server/session"
import { publishCarpool, searchCarpools, suggestPrice } from "@/server/services"

export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url)
    if (url.searchParams.get("suggest") === "1") {
      return suggestPrice(
        {
          label: url.searchParams.get("originLabel"),
          city: url.searchParams.get("originCity"),
          lat: Number(url.searchParams.get("originLat")),
          lng: Number(url.searchParams.get("originLng")),
        },
        {
          label: url.searchParams.get("destLabel"),
          city: url.searchParams.get("destCity"),
          lat: Number(url.searchParams.get("destLat")),
          lng: Number(url.searchParams.get("destLng")),
        },
      )
    }
    return searchCarpools({
      userId: await requireUserId(),
      origin: {
        label: url.searchParams.get("originLabel"),
        city: url.searchParams.get("originCity"),
        lat: Number(url.searchParams.get("originLat")),
        lng: Number(url.searchParams.get("originLng")),
      },
      destination: {
        label: url.searchParams.get("destLabel"),
        city: url.searchParams.get("destCity"),
        lat: Number(url.searchParams.get("destLat")),
        lng: Number(url.searchParams.get("destLng")),
      },
      date: url.searchParams.get("date") ?? "",
      seats: Number(url.searchParams.get("seats") ?? 1),
    })
  })
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json()) as {
      origin?: unknown
      destination?: unknown
      departAt?: string
      seats?: number
      price?: number
      notes?: string
      amenities?: string[]
      serene?: boolean
    }
    return publishCarpool({
      driverId: await requireUserId(),
      origin: body.origin,
      destination: body.destination,
      departAt: body.departAt ?? "",
      seats: body.seats ?? 1,
      price: body.price ?? 0,
      notes: body.notes ?? "",
      amenities: body.amenities ?? [],
      serene: Boolean(body.serene),
    })
  })
}
