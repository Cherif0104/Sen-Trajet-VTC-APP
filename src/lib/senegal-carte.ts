import carte from "@/data/senegal-lieux.json"
import { haversineKm, norm } from "@/lib/domain"
import type { GeoPoint } from "@/lib/places"

type Lieu = {
  name: string
  region: string
  lat: number
  lng: number
  population: number
  kind: string
}

const lieux = carte.lieux as Lieu[]

export const SENEGAL_REGIONS = carte.regions

function toPoint(lieu: Lieu, lat = lieu.lat, lng = lieu.lng, label = lieu.name): GeoPoint {
  return { label, city: lieu.name, area: lieu.region, lat, lng, kind: "ville" }
}

export function searchLieux(query: string): GeoPoint[] {
  const needle = norm(query)
  if (needle.length < 2) return []
  const ranked = lieux
    .map((lieu) => {
      const name = norm(lieu.name)
      const region = norm(lieu.region)
      let score = 0
      if (name === needle) score = 100
      else if (name.startsWith(needle)) score = 80
      else if (region === needle) score = 60
      else if (name.includes(needle) || `region de ${region}` === needle || region.includes(needle)) score = 40
      return { lieu, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.lieu.population - a.lieu.population || a.lieu.name.localeCompare(b.lieu.name, "fr"))
  const primary = ranked.filter((item) => item.score >= 80)
  const extra = ranked.filter((item) => item.score < 80).slice(0, 2)
  return [...primary, ...extra].slice(0, 6).map(({ lieu }) => toPoint(lieu))
}

export function nearestLieu(lat: number, lng: number, maxKm = 30): GeoPoint | null {
  let best: Lieu | null = null
  let bestKm = maxKm
  for (const lieu of lieux) {
    const km = haversineKm({ lat, lng }, lieu)
    if (km < bestKm) {
      best = lieu
      bestKm = km
    }
  }
  if (!best) return null
  const label = bestKm > 3 ? `Près de ${best.name}` : best.name
  return toPoint(best, lat, lng, label)
}
