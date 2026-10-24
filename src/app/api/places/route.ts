import { searchPlaces, toPoint } from "@/lib/places"
import { handle } from "@/server/http"

type RemotePlace = { display_name?: string; lat?: string; lon?: string; address?: { city?: string; town?: string; state?: string } }

export async function GET(request: Request) {
  return handle(async () => {
    const query = new URL(request.url).searchParams.get("q") ?? ""
    const local = searchPlaces(query).map((place) => toPoint(place))
    if (query.trim().length < 3 || local.length >= 3 || process.env.YOON_SKIP_ROUTING === "1") {
      return { places: local }
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=sn&q=${encodeURIComponent(query)}`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2000),
        headers: {
          "User-Agent": "SenTrajet/0.1 (preproduction; senegal)",
          "Accept-Language": "fr",
        },
      })
      if (!response.ok) return { places: local }
      const remote = (await response.json()) as RemotePlace[]
      const extra = remote
        .map((item) => ({
          label: (item.display_name ?? "").split(",").slice(0, 2).join(",").trim(),
          city: item.address?.city || item.address?.town || item.address?.state || "Sénégal",
          lat: Number(item.lat),
          lng: Number(item.lon),
        }))
        .filter((item) => item.label && Number.isFinite(item.lat) && Number.isFinite(item.lng))
      const seen = new Set(local.map((place) => place.label.toLowerCase()))
      return { places: [...local, ...extra.filter((place) => !seen.has(place.label.toLowerCase()))].slice(0, 8) }
    } catch {
      return { places: local }
    }
  })
}
