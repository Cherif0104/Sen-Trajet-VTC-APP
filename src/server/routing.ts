import { blendDuration, lineRoute, measureFallback, type LatLng } from "@/lib/domain"

export type PlannedRoute = {
  distanceM: number
  durationS: number
  route: [number, number][]
}

const cache = new Map<string, PlannedRoute>()

export async function planRoute(pickup: LatLng, dropoff: LatLng): Promise<PlannedRoute> {
  const key = `${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}:${dropoff.lat.toFixed(4)},${dropoff.lng.toFixed(4)}`
  const cached = cache.get(key)
  if (cached) return cached
  const fallback = measureFallback(pickup, dropoff)
  if (process.env.YOON_SKIP_ROUTING === "1") {
    const planned = { ...fallback, route: lineRoute(pickup, dropoff) }
    cache.set(key, planned)
    return planned
  }
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      headers: { "User-Agent": "Yoon/0.1 (preproduction)" },
    })
    if (!response.ok) throw new Error("osrm")
    const json = (await response.json()) as {
      routes?: {
        distance: number
        duration: number
        geometry: { coordinates: [number, number][] }
      }[]
    }
    const route = json.routes?.[0]
    if (!route) throw new Error("osrm")
    const distanceM = Math.round(route.distance)
    const planned = {
      distanceM,
      durationS: blendDuration(distanceM, Math.round(route.duration)),
      route: route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    }
    cache.set(key, planned)
    return planned
  } catch {
    const planned = { ...fallback, route: lineRoute(pickup, dropoff) }
    cache.set(key, planned)
    return planned
  }
}
