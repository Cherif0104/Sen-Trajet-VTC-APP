export function fcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} F`
}

export function formatWhen(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Dakar",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Dakar",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatKm(meters: number) {
  const km = meters / 1000
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`
  return `${Math.round(km)} km`
}

export function formatMinutes(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest}` : `${hours} h`
}

export function seatsLabel(count: number) {
  return count > 1 ? `${count} sièges` : `${count} siège`
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

export function dakarOffsetDate(offset: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dakar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const [year, month, day] = parts.split("-").map(Number)
  return new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + offset)).toISOString().slice(0, 10)
}

export function formatDay(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Dakar",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00.000Z`))
}

export const AMENITY_LABELS: Record<string, string> = {
  clim: "Climatisation",
  bagage: "Bagages",
  musique: "Musique",
  non_fumeur: "Non-fumeur",
}

export function rideStatusLabel(status: string) {
  const labels: Record<string, string> = {
    matching: "Recherche",
    accepted: "Chauffeur en route",
    arrived: "Au point de rendez-vous",
    in_progress: "En course",
    completed: "Terminée",
    cancelled: "Annulée",
  }
  return labels[status] ?? status
}

export function txLabel(type: string) {
  const labels: Record<string, string> = {
    welcome: "Crédit de bienvenue",
    topup: "Recharge",
    ride_payment: "Paiement course",
    ride_earning: "Gain course",
    commission: "Commission espèces",
    refund: "Remboursement",
    carpool_payment: "Paiement covoiturage",
    carpool_earning: "Gain covoiturage",
    cancel_fee: "Frais d’annulation",
  }
  return labels[type] ?? type
}
