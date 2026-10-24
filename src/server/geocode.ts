import { searchPlaces, toPoint, type GeoPoint } from "@/lib/places"

const BOX = { minLat: 12.2, maxLat: 16.8, minLng: -17.8, maxLng: -11.2 }

export function inSenegal(lat: number, lng: number) {
  return lat >= BOX.minLat && lat <= BOX.maxLat && lng >= BOX.minLng && lng <= BOX.maxLng
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    name?: string
    street?: string
    city?: string
    state?: string
    countrycode?: string
    district?: string
    locality?: string
    housenumber?: string
  }
}

function fromPhoton(feature: PhotonFeature): GeoPoint | null {
  const [lng, lat] = feature.geometry?.coordinates ?? []
  const props = feature.properties ?? {}
  if (props.countrycode && props.countrycode !== "SN") return null
  if (typeof lat !== "number" || typeof lng !== "number" || !inSenegal(lat, lng)) return null
  const street = [props.housenumber, props.street || props.name].filter(Boolean).join(" ")
  const label = street || props.name || props.locality || ""
  if (!label) return null
  const place: GeoPoint = {
    label,
    city: props.city || props.locality || props.state || "Sénégal",
    lat,
    lng,
  }
  if (props.district) place.area = props.district
  return place
}

async function photon(path: string) {
  const response = await fetch(`https://photon.komoot.io${path}`, {
    signal: AbortSignal.timeout(2500),
    headers: { Accept: "application/json", "Accept-Language": "fr" },
  })
  if (!response.ok) return []
  const body = (await response.json()) as { features?: PhotonFeature[] }
  const places: GeoPoint[] = []
  for (const feature of body.features ?? []) {
    const place = fromPhoton(feature)
    if (place) places.push(place)
  }
  return places
}

async function nominatimSearch(query: string): Promise<GeoPoint[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=sn&q=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    signal: AbortSignal.timeout(2500),
    headers: { "User-Agent": "SenTrajet/1.0 (senegal)", "Accept-Language": "fr" },
  })
  if (!response.ok) return []
  const remote = (await response.json()) as {
    display_name?: string
    lat?: string
    lon?: string
    address?: { city?: string; town?: string; village?: string; state?: string; suburb?: string }
  }[]
  const places: GeoPoint[] = []
  for (const item of remote) {
    const lat = Number(item.lat)
    const lng = Number(item.lon)
    const label = (item.display_name ?? "").split(",").slice(0, 2).join(",").trim()
    if (!label || !inSenegal(lat, lng)) continue
    const place: GeoPoint = {
      label,
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.state || "Sénégal",
      lat,
      lng,
    }
    if (item.address?.suburb) place.area = item.address.suburb
    places.push(place)
  }
  return places
}

function catalog(query: string) {
  return searchPlaces(query).map((place) => toPoint(place)).slice(0, 6)
}

export async function searchAddresses(query: string): Promise<GeoPoint[]> {
  const q = query.trim()
  if (q.length < 2) return []
  if (process.env.YOON_SKIP_ROUTING === "1") return catalog(q)
  try {
    const remote = await photon(
      `/api/?q=${encodeURIComponent(q)}&limit=6&lat=14.72&lon=-17.45&lang=fr&bbox=-17.8,12.2,-11.2,16.8`,
    )
    if (remote.length) return remote.slice(0, 6)
  } catch {
    /* Photon indisponible : Nominatim, puis le catalogue. */
  }
  try {
    const remote = await nominatimSearch(q)
    if (remote.length) return remote.slice(0, 6)
  } catch {
    /* Le catalogue local ne sert que si les deux géocodeurs échouent. */
  }
  return catalog(q)
}

export async function reverseAddress(lat: number, lng: number): Promise<GeoPoint | null> {
  if (!inSenegal(lat, lng)) return null
  const here = { label: "Ma position", city: "Sénégal", lat, lng }
  if (process.env.YOON_SKIP_ROUTING === "1") return here
  try {
    const hits = await photon(`/reverse?lat=${lat}&lon=${lng}&lang=fr`)
    if (hits[0]) return { ...hits[0], lat, lng }
  } catch {
    /* reverse Photon raté */
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      headers: { "User-Agent": "SenTrajet/1.0 (senegal)", "Accept-Language": "fr" },
    })
    if (response.ok) {
      const item = (await response.json()) as {
        display_name?: string
        address?: { city?: string; town?: string; village?: string; state?: string; suburb?: string; road?: string }
      }
      const road = item.address?.road
      const label = road || (item.display_name ?? "").split(",").slice(0, 2).join(",").trim()
      if (label) {
        return {
          label,
          city: item.address?.city || item.address?.town || item.address?.village || item.address?.state || "Sénégal",
          area: item.address?.suburb,
          lat,
          lng,
        }
      }
    }
  } catch {
    /* reverse Nominatim raté */
  }
  return here
}
