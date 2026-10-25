import { reverseAddress, searchAddresses } from "@/server/geocode"
import { handle } from "@/server/http"

export async function GET(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams
    const lat = Number(params.get("lat"))
    const lng = Number(params.get("lng"))
    if (params.has("lat") && params.has("lng") && Number.isFinite(lat) && Number.isFinite(lng)) {
      return { place: await reverseAddress(lat, lng) }
    }
    const kind = params.get("kind")
    const filter =
      kind === "ville" || kind === "quartier" || kind === "pharmacie" || kind === "ecole" || kind === "commerce" || kind === "rue"
        ? kind
        : null
    return { places: await searchAddresses(params.get("q") ?? "", filter) }
  })
}
