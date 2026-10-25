import { norm, type LatLng } from "@/lib/domain"

export type PlaceKind = "ville" | "quartier" | "pharmacie" | "ecole" | "commerce" | "rue"

export type GeoPoint = LatLng & {
  label: string
  city: string
  area?: string
  kind?: PlaceKind
}

export type CatalogPlace = GeoPoint & { id: string }

export const PLACES: CatalogPlace[] = [
  { id: "independance", label: "Place de l’Indépendance", area: "Plateau", city: "Dakar", lat: 14.6696, lng: -17.4281 },
  { id: "kermel", label: "Marché Kermel", area: "Plateau", city: "Dakar", lat: 14.6678, lng: -17.4289 },
  { id: "sandaga", label: "Marché Sandaga", area: "Plateau", city: "Dakar", lat: 14.6718, lng: -17.4362 },
  { id: "port", label: "Port de Dakar", area: "Plateau", city: "Dakar", lat: 14.6805, lng: -17.4295 },
  { id: "ucad", label: "UCAD", area: "Fann", city: "Dakar", lat: 14.6922, lng: -17.4627 },
  { id: "fann", label: "Hôpital Fann", area: "Fann", city: "Dakar", lat: 14.6945, lng: -17.462 },
  { id: "point-e", label: "Point E", area: "Point E", city: "Dakar", lat: 14.6988, lng: -17.4578 },
  { id: "mermoz", label: "Mermoz", area: "Mermoz", city: "Dakar", lat: 14.7072, lng: -17.4758 },
  { id: "sacre-coeur", label: "Sacré-Cœur", area: "Sacré-Cœur", city: "Dakar", lat: 14.7165, lng: -17.4678 },
  { id: "liberte6", label: "Liberté 6", area: "Liberté", city: "Dakar", lat: 14.7224, lng: -17.4542 },
  { id: "ouakam", label: "Ouakam", area: "Ouakam", city: "Dakar", lat: 14.7248, lng: -17.4908 },
  { id: "sea-plaza", label: "Sea Plaza", area: "Corniche", city: "Dakar", lat: 14.7048, lng: -17.4932 },
  { id: "radisson", label: "Radisson Blu", area: "Corniche", city: "Dakar", lat: 14.6988, lng: -17.4805 },
  { id: "renaissance", label: "Monument de la Renaissance", area: "Ouakam", city: "Dakar", lat: 14.7223, lng: -17.4954 },
  { id: "almadies", label: "Almadies", area: "Almadies", city: "Dakar", lat: 14.7452, lng: -17.5256 },
  { id: "ngor", label: "Ngor", area: "Ngor", city: "Dakar", lat: 14.7478, lng: -17.5138 },
  { id: "yoff", label: "Yoff", area: "Yoff", city: "Dakar", lat: 14.7588, lng: -17.4788 },
  { id: "grand-yoff", label: "Grand Yoff", area: "Grand Yoff", city: "Dakar", lat: 14.7342, lng: -17.4548 },
  { id: "parcelles", label: "Parcelles Assainies", area: "Parcelles", city: "Dakar", lat: 14.7648, lng: -17.4372 },
  { id: "hlm", label: "HLM", area: "HLM", city: "Dakar", lat: 14.716, lng: -17.444 },
  { id: "pikine", label: "Pikine", area: "Pikine", city: "Dakar", lat: 14.7549, lng: -17.3907 },
  { id: "guediawaye", label: "Guédiawaye", area: "Guédiawaye", city: "Dakar", lat: 14.7696, lng: -17.4102 },
  { id: "keur-massar", label: "Keur Massar", area: "Keur Massar", city: "Dakar", lat: 14.7865, lng: -17.3125 },
  { id: "baux", label: "Gare des Baux Maraîchers", area: "Pikine", city: "Dakar", lat: 14.7512, lng: -17.4288 },
  { id: "rufisque", label: "Rufisque", area: "Rufisque", city: "Rufisque", lat: 14.7163, lng: -17.273 },
  { id: "diamniadio", label: "Diamniadio", area: "Diamniadio", city: "Diamniadio", lat: 14.7206, lng: -17.187 },
  { id: "aibd", label: "Aéroport AIBD", area: "Diass", city: "Diass", lat: 14.6703, lng: -17.0733 },
  { id: "thies", label: "Thiès centre", area: "Thiès", city: "Thiès", lat: 14.7886, lng: -16.925 },
  { id: "mbour", label: "Mbour", area: "Mbour", city: "Mbour", lat: 14.4213, lng: -16.9639 },
  { id: "saly", label: "Saly", area: "Saly", city: "Saly", lat: 14.4436, lng: -17.0158 },
  { id: "saint-louis", label: "Saint-Louis", area: "Saint-Louis", city: "Saint-Louis", lat: 16.0326, lng: -16.4897 },
  { id: "touba", label: "Touba", area: "Touba", city: "Touba", lat: 14.8667, lng: -15.8833 },
  { id: "kaolack", label: "Kaolack", area: "Kaolack", city: "Kaolack", lat: 14.151, lng: -16.0756 },
]

export const POPULAR_IDS = [
  "almadies",
  "independance",
  "aibd",
  "ucad",
  "baux",
  "pikine",
  "sacre-coeur",
  "thies",
  "mbour",
  "touba",
]

export function placeById(id: string) {
  return PLACES.find((place) => place.id === id) ?? null
}

export function searchPlaces(query: string) {
  const needle = norm(query)
  if (!needle) return POPULAR_IDS.map((id) => placeById(id)).filter((place) => place != null)
  return PLACES.filter((place) =>
    norm(`${place.label} ${place.area ?? ""} ${place.city}`).includes(needle),
  ).slice(0, 8)
}

export function toPoint(place: CatalogPlace): GeoPoint {
  return {
    label: place.label,
    city: place.city,
    area: place.area,
    lat: place.lat,
    lng: place.lng,
    kind: norm(place.city) === "dakar" ? "quartier" : "ville",
  }
}
