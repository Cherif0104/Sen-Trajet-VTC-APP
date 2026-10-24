import type { GeoPoint } from "@/lib/places"

export function carpoolQuery(origin: GeoPoint, destination: GeoPoint, extra?: Record<string, string>) {
  const params = new URLSearchParams({
    originLabel: origin.label,
    originCity: origin.city,
    originLat: String(origin.lat),
    originLng: String(origin.lng),
    destLabel: destination.label,
    destCity: destination.city,
    destLat: String(destination.lat),
    destLng: String(destination.lng),
    ...extra,
  })
  return params.toString()
}
