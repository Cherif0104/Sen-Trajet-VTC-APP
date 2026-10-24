export type CategoryId = "jakarta" | "eco" | "confort" | "van"

export type PayMethod = "wallet" | "wave" | "orange" | "free" | "cash"

export type LatLng = { lat: number; lng: number }

export const CATEGORIES: Record<
  CategoryId,
  {
    id: CategoryId
    label: string
    detail: string
    seats: number
    base: number
    perKm: number
    perMin: number
    minimum: number
    commission: number
    radiusKm: number
    botRadiusKm: number
  }
> = {
  jakarta: {
    id: "jakarta",
    label: "Jakarta",
    detail: "Moto, pour passer entre les bouchons",
    seats: 1,
    base: 300,
    perKm: 120,
    perMin: 15,
    minimum: 500,
    commission: 0.1,
    radiusKm: 7,
    botRadiusKm: 14,
  },
  eco: {
    id: "eco",
    label: "Éco",
    detail: "Berline climatisée, le quotidien",
    seats: 4,
    base: 450,
    perKm: 220,
    perMin: 30,
    minimum: 800,
    commission: 0.12,
    radiusKm: 12,
    botRadiusKm: 34,
  },
  confort: {
    id: "confort",
    label: "Confort",
    detail: "Plus d’espace, eau et chargeur",
    seats: 4,
    base: 700,
    perKm: 320,
    perMin: 40,
    minimum: 1200,
    commission: 0.12,
    radiusKm: 12,
    botRadiusKm: 34,
  },
  van: {
    id: "van",
    label: "7 places",
    detail: "Famille, bagages, aéroport",
    seats: 6,
    base: 900,
    perKm: 380,
    perMin: 45,
    minimum: 1800,
    commission: 0.12,
    radiusKm: 14,
    botRadiusKm: 48,
  },
}

export const CATEGORY_ORDER: CategoryId[] = ["eco", "confort", "jakarta", "van"]

export const AIBD = { lat: 14.6703, lng: -17.0733 }

export const PAY_METHODS: { id: PayMethod; label: string; hint: string }[] = [
  { id: "wave", label: "Wave", hint: "Confirmé automatiquement" },
  { id: "orange", label: "Orange Money", hint: "Confirmé automatiquement" },
  { id: "free", label: "Free Money", hint: "Confirmé automatiquement" },
  { id: "wallet", label: "Portefeuille Sen Trajet", hint: "Débit du solde" },
  { id: "cash", label: "Espèces", hint: "Remises au chauffeur" },
]

export function roundTo(value: number, step: number) {
  return Math.round(value / step) * step
}

export function haversineKm(a: LatLng, b: LatLng) {
  const r = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function roadDistanceKm(straightKm: number) {
  return straightKm * (straightKm > 35 ? 1.16 : 1.38)
}

export function estimateDurationMin(distanceKm: number) {
  const speed = distanceKm > 40 ? 62 : distanceKm > 15 ? 28 : 22
  return Math.max(4, Math.round((distanceKm / speed) * 60))
}

export function isAirport(point: LatLng) {
  return haversineKm(point, AIBD) < 4
}

export function measureFallback(pickup: LatLng, dropoff: LatLng) {
  const straight = haversineKm(pickup, dropoff)
  const distanceKm = roadDistanceKm(straight)
  return {
    distanceM: Math.round(distanceKm * 1000),
    durationS: estimateDurationMin(distanceKm) * 60,
  }
}

export function blendDuration(distanceM: number, osrmDurationS: number | null) {
  const traffic = estimateDurationMin(distanceM / 1000) * 60
  if (osrmDurationS == null) return traffic
  return Math.max(osrmDurationS, Math.round(traffic * 0.85))
}

export function surgeFor(at: Date, pickup: LatLng) {
  const hour = at.getUTCHours()
  const day = at.getUTCDay()
  const morning = hour >= 7 && hour < 9
  const evening = hour >= 17 && hour < 20
  const friday = day === 5 && hour >= 16 && hour < 21
  const night = hour >= 22 || hour < 5
  let multiplier = 1
  let label: string | null = null
  if (friday) {
    multiplier = 1.25
    label = "Vendredi, demande élevée"
  } else if (morning || evening) {
    multiplier = 1.15
    label = "Heure de pointe"
  } else if (night) {
    multiplier = 1.1
    label = "Majoration de nuit"
  }
  const plateau =
    pickup.lat < 14.69 &&
    pickup.lat > 14.655 &&
    pickup.lng > -17.45 &&
    pickup.lng < -17.42
  if (plateau && (morning || evening || friday)) {
    multiplier += 0.08
    label = "Plateau, heure de pointe"
  }
  if (isAirport(pickup)) multiplier = Math.max(multiplier, 1.05)
  multiplier = Math.min(1.6, Math.round(multiplier * 100) / 100)
  return { multiplier, label }
}

export function priceRoute(
  category: CategoryId,
  distanceM: number,
  durationS: number,
  pickup: LatLng,
  dropoff: LatLng,
  at: Date,
) {
  const cat = CATEGORIES[category]
  const km = distanceM / 1000
  const minutes = durationS / 60
  const surge = surgeFor(at, pickup)
  const airport = isAirport(pickup) || isAirport(dropoff)
  let raw = (cat.base + km * cat.perKm + minutes * cat.perMin) * surge.multiplier
  if (airport && category === "van") raw += 2500
  else if (airport && category !== "jakarta") raw += 1500
  const fare = Math.max(cat.minimum, roundTo(raw, 50))
  const commission = Math.round(fare * cat.commission)
  let surgeLabel = surge.label
  if (airport) {
    surgeLabel = surgeLabel ? `${surgeLabel} · forfait aéroport` : "Forfait aéroport inclus"
  }
  return {
    fare,
    commission,
    driverNet: fare - commission,
    surge: surge.multiplier,
    surgeLabel,
    airport,
  }
}

export type Quote = {
  category: CategoryId
  label: string
  detail: string
  seats: number
  fare: number | null
  surge: number
  surgeLabel: string | null
  distanceM: number
  durationS: number
  etaPickupS: number | null
  available: boolean
  reason?: string
  commission: number
  driverNet: number
}

export function approachSeconds(distanceKm: number, bot: boolean) {
  const real = Math.round((distanceKm / 25) * 3600)
  if (!bot) return Math.max(90, real)
  return Math.max(12, Math.min(40, Math.round(real / 6)))
}

export function tripMotionSeconds(durationS: number, bot: boolean) {
  if (!bot) return Math.max(60, durationS)
  return Math.max(18, Math.min(75, Math.round(durationS / 6)))
}

export function quoteAll(input: {
  pickup: LatLng
  dropoff: LatLng
  at: Date
  distanceM: number
  durationS: number
  nearest: Partial<Record<CategoryId, { km: number; bot: boolean } | null>>
}): Quote[] {
  const km = input.distanceM / 1000
  const tooShort = km < 0.35
  return CATEGORY_ORDER.map((category) => {
    const cat = CATEGORIES[category]
    const priced = priceRoute(
      category,
      input.distanceM,
      input.durationS,
      input.pickup,
      input.dropoff,
      input.at,
    )
    const nearest = input.nearest[category]
    let reason: string | undefined
    if (tooShort) reason = "Ce trajet est trop court."
    else if (category === "jakarta" && (km > 25 || priced.airport)) {
      reason = "Le Jakarta reste dans Dakar."
    } else if (!nearest) reason = "Aucun chauffeur libre à proximité."
    const available = !reason
    return {
      category,
      label: cat.label,
      detail: cat.detail,
      seats: cat.seats,
      fare: available ? priced.fare : priced.fare,
      surge: priced.surge,
      surgeLabel: priced.surgeLabel,
      distanceM: input.distanceM,
      durationS: input.durationS,
      etaPickupS: nearest ? approachSeconds(nearest.km, nearest.bot) : null,
      available,
      reason,
      commission: priced.commission,
      driverNet: priced.driverNet,
    }
  })
}

export type RankableDriver = {
  id: string
  lat: number
  lng: number
  online: boolean
  busy: boolean
  category: CategoryId
  serene: boolean
  bot: boolean
  rating: number
  acceptance: number
  kyc: string
}

export function rankDrivers(input: {
  drivers: RankableDriver[]
  pickup: LatLng
  category: CategoryId
  serene: boolean
  exclude?: string[]
}) {
  const cat = CATEGORIES[input.category]
  const excluded = new Set(input.exclude ?? [])
  return input.drivers
    .filter(
      (driver) =>
        driver.online &&
        !driver.busy &&
        driver.kyc === "verified" &&
        driver.category === input.category &&
        !excluded.has(driver.id),
    )
    .filter((driver) => !input.serene || driver.serene)
    .map((driver) => ({
      driver,
      km: haversineKm(input.pickup, driver),
    }))
    .filter((item) => item.km <= (item.driver.bot ? cat.botRadiusKm : cat.radiusKm))
    .sort((a, b) => {
      const score = (item: { driver: RankableDriver; km: number }) =>
        item.km +
        (item.driver.bot ? 1.15 : 0) +
        (5 - item.driver.rating) * 0.35 +
        (1 - item.driver.acceptance) * 2
      return score(a) - score(b)
    })
}

export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "")
  if (digits.startsWith("00221")) digits = digits.slice(5)
  else if (digits.startsWith("221")) digits = digits.slice(3)
  if (digits.length === 9 && /^7\d{8}$/.test(digits)) return `+221${digits}`
  return null
}

export function normalizePlate(input: string) {
  const plate = input.trim().toUpperCase().replace(/\s+/g, " ")
  if (!/^[A-Z]{2}\s?-?\s?\d{3,4}\s?-?\s?[A-Z]{1,2}$/.test(plate)) return null
  return plate
}

const CORRIDORS: { a: string; b: string; price: number }[] = [
  { a: "dakar", b: "thies", price: 2000 },
  { a: "dakar", b: "mbour", price: 2500 },
  { a: "dakar", b: "saly", price: 2500 },
  { a: "dakar", b: "touba", price: 5000 },
  { a: "dakar", b: "saint-louis", price: 6000 },
  { a: "dakar", b: "kaolack", price: 4500 },
  { a: "dakar", b: "rufisque", price: 1000 },
  { a: "dakar", b: "diass", price: 3000 },
  { a: "thies", b: "mbour", price: 1500 },
]

export function norm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
}

export function suggestSeatPrice(originCity: string, destCity: string, distanceKm: number) {
  const origin = norm(originCity)
  const dest = norm(destCity)
  for (const corridor of CORRIDORS) {
    if (
      (origin.includes(corridor.a) && dest.includes(corridor.b)) ||
      (origin.includes(corridor.b) && dest.includes(corridor.a))
    ) {
      return corridor.price
    }
  }
  if (origin === dest) {
    return Math.min(2000, Math.max(500, roundTo(distanceKm * 85, 50)))
  }
  const rate = distanceKm > 150 ? 24 : 30
  return Math.max(1000, roundTo(distanceKm * rate, 100))
}

export function priceBandError(price: number, suggestion: number) {
  if (price < suggestion * 0.6) {
    return "Ce prix est trop bas pour le trajet. Sen Trajet le refuse pour protéger le chauffeur."
  }
  if (price > suggestion * 1.7) {
    return "Ce prix dépasse largement le tarif habituel du corridor."
  }
  return null
}

export function carpoolRefund(amount: number, departAt: Date, at: Date) {
  const hours = (departAt.getTime() - at.getTime()) / 3_600_000
  if (hours >= 2) {
    return {
      refund: amount,
      label: "Remboursement intégral : plus de 2 h avant le départ.",
    }
  }
  if (hours > 0) {
    return {
      refund: Math.round(amount / 2),
      label: "Remboursement de moitié : moins de 2 h avant le départ.",
    }
  }
  return {
    refund: 0,
    label: "Le départ est passé : le siège n’est plus remboursable.",
  }
}

export function lineRoute(a: LatLng, b: LatLng, steps = 28): [number, number][] {
  const points: [number, number][] = []
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    points.push([a.lat + (b.lat - a.lat) * t, a.lng + (b.lng - a.lng) * t])
  }
  return points
}

export function pointOnRoute(route: [number, number][], progress: number) {
  if (route.length === 0) return null
  const clamped = Math.min(1, Math.max(0, progress))
  const cursor = clamped * (route.length - 1)
  const index = Math.floor(cursor)
  const next = Math.min(route.length - 1, index + 1)
  const mix = cursor - index
  return {
    lat: route[index][0] + (route[next][0] - route[index][0]) * mix,
    lng: route[index][1] + (route[next][1] - route[index][1]) * mix,
  }
}

export function lerpPoint(a: LatLng, b: LatLng, progress: number): LatLng {
  const t = Math.min(1, Math.max(0, progress))
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

export function projectRide(
  ride: {
    status: string
    bot: boolean
    acceptedAt: string | null
    arrivedAt: string | null
    startedAt: string | null
    approachS: number
    tripMotionS: number
    offerExpiresAt: string | null
    offeredDriverId: string | null
  },
  at: Date,
) {
  if (
    ride.status === "matching" &&
    ride.offerExpiresAt &&
    ride.offeredDriverId &&
    new Date(ride.offerExpiresAt).getTime() <= at.getTime()
  ) {
    return { event: "offer_expired" as const }
  }
  if (ride.bot && ride.status === "accepted" && ride.acceptedAt) {
    const progress =
      (at.getTime() - new Date(ride.acceptedAt).getTime()) / (ride.approachS * 1000)
    if (progress >= 1) return { event: "arrived" as const }
  }
  if (ride.bot && ride.status === "arrived" && ride.arrivedAt) {
    if (at.getTime() - new Date(ride.arrivedAt).getTime() >= 50_000) {
      return { event: "noshow" as const }
    }
  }
  if (ride.bot && ride.status === "in_progress" && ride.startedAt) {
    const progress =
      (at.getTime() - new Date(ride.startedAt).getTime()) / (ride.tripMotionS * 1000)
    if (progress >= 1) return { event: "completed" as const }
  }
  return { event: null }
}

export function ridePhase(
  ride: {
    status: string
    acceptedAt: string | null
    startedAt: string | null
    approachS: number
    tripMotionS: number
    driverStartLat: number | null
    driverStartLng: number | null
    pickup: LatLng
    dropoff: LatLng
    route: [number, number][]
  },
  at: Date,
) {
  if ((ride.status === "accepted" || ride.status === "arrived") && ride.acceptedAt) {
    const progress = Math.min(
      1,
      (at.getTime() - new Date(ride.acceptedAt).getTime()) / (ride.approachS * 1000),
    )
    const start =
      ride.driverStartLat != null && ride.driverStartLng != null
        ? { lat: ride.driverStartLat, lng: ride.driverStartLng }
        : ride.pickup
    const point = ride.status === "arrived" ? ride.pickup : lerpPoint(start, ride.pickup, progress)
    const etaS =
      ride.status === "arrived"
        ? 0
        : Math.max(0, Math.round(ride.approachS * (1 - progress)))
    return { progress, point, etaS }
  }
  if (ride.status === "in_progress" && ride.startedAt) {
    const progress = Math.min(
      1,
      (at.getTime() - new Date(ride.startedAt).getTime()) / (ride.tripMotionS * 1000),
    )
    return {
      progress,
      point: pointOnRoute(ride.route, progress) ?? ride.dropoff,
      etaS: Math.max(0, Math.round(ride.tripMotionS * (1 - progress))),
    }
  }
  if (ride.status === "completed") {
    return { progress: 1, point: ride.dropoff, etaS: 0 }
  }
  return { progress: 0, point: null as LatLng | null, etaS: null as number | null }
}

export function demandZones(at: Date) {
  const hour = at.getUTCHours()
  const friday = at.getUTCDay() === 5
  const level = (active: boolean, strong = false) =>
    active ? (strong ? "Forte" : "Soutenue") : "Calme"
  return [
    {
      name: "Plateau",
      level: level((hour >= 7 && hour < 10) || (hour >= 16 && hour < 19), true),
    },
    { name: "Almadies", level: level(hour >= 19 && hour < 23) },
    {
      name: "AIBD",
      level: level((hour >= 5 && hour < 9) || (hour >= 16 && hour < 21), true),
    },
    { name: "Parcelles", level: level(hour >= 6 && hour < 9, true) },
    { name: "Axe Touba", level: level(friday, true) },
  ]
}

export function dakarDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dakar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value))
}

export function paymentReference(method: PayMethod) {
  const prefix = { wave: "WV", orange: "OM", free: "FM", wallet: "YN", cash: "ESP" }[method]
  const token = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${token}`
}

export function cancelFee(fare: number) {
  return Math.min(500, fare)
}
