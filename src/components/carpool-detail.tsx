"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { FleetBadge } from "@/components/demo-indicator"
import { FocusBar } from "@/components/focus-bar"
import { PayPicker } from "@/components/pay-picker"
import { RideMap } from "@/components/ride-map"
import { useMe } from "@/components/use-me"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/client"
import type { PayMethod } from "@/lib/domain"
import type { CarpoolDTO } from "@/lib/dto"
import { AMENITY_LABELS, fcfa, formatKm, formatMinutes, formatWhen, seatsLabel } from "@/lib/format"

export function CarpoolDetail({ id }: { id: string }) {
  const { me, reload } = useMe()
  const [trip, setTrip] = useState<CarpoolDTO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [seats, setSeats] = useState(1)
  const [method, setMethod] = useState<PayMethod>("cash")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void api<CarpoolDTO>(`/api/carpools/${id}`)
      .then(setTrip)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Départ introuvable."))
  }, [id])

  async function run(body: Record<string, unknown>) {
    setBusy(true)
    try {
      const result = await api<CarpoolDTO | { message: string; carpool: CarpoolDTO }>(`/api/carpools/${id}`, {
        method: "POST",
        body: JSON.stringify(body),
      })
      if ("carpool" in result) {
        setTrip(result.carpool)
        toast.success(result.message)
      } else {
        setTrip(result)
        toast.success(body.action === "book" ? "Siège confirmé." : "Départ annulé. Les passagers sont remboursés.")
      }
      void reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Action impossible.")
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        <FocusBar title="Départ" back="/app/covoiturage" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }
  if (!trip) {
    return (
      <div className="px-4 py-6">
        <FocusBar title="Départ" back="/app/covoiturage" />
      </div>
    )
  }

  const amount = trip.pricePerSeat * seats
  const open = trip.status === "published" && trip.seatsLeft > 0 && !trip.mine && !trip.booking

  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="h-[38vh] md:h-dvh">
        <RideMap pickup={trip.origin} dropoff={trip.destination} />
      </div>
      <div className="flex flex-col gap-4 px-4 py-4 md:h-dvh md:overflow-y-auto">
        <FocusBar title={formatWhen(trip.departAt)} back="/app/covoiturage" />
        <div>
          <h2 className="font-display text-3xl text-balance">
            {trip.origin.label} → {trip.destination.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatKm(trip.distanceM)} · {formatMinutes(trip.durationS)} · {fcfa(trip.pricePerSeat)} / siège
          </p>
        </div>
        <div className="rounded-3xl bg-card px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{trip.driver.name}</p>
            <FleetBadge launchFleet={trip.driver.launchFleet} />
          </div>
          <p className="text-sm text-muted-foreground">
            {trip.driver.color} {trip.driver.make} {trip.driver.model} · {trip.driver.plate} ·{" "}
            {trip.driver.rating.toFixed(1).replace(".", ",")} ({trip.driver.ratingCount})
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {trip.serene ? <Badge className="bg-accent text-accent-foreground">Serein</Badge> : null}
            {trip.amenities.map((item) => (
              <Badge key={item} variant="outline">
                {AMENITY_LABELS[item] ?? item}
              </Badge>
            ))}
          </div>
          {trip.notes ? <p className="mt-3 text-sm">{trip.notes}</p> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Remboursement intégral plus de 2 h avant le départ, moitié en dessous, rien après l’heure. Si le chauffeur
          annule, vous êtes remboursé en totalité. {seatsLabel(trip.seatsLeft)} encore {trip.seatsLeft > 1 ? "libres" : "libre"} sur {trip.seatsTotal}.
        </p>

        {trip.booking ? (
          <div className="flex flex-col gap-3 rounded-3xl bg-secondary px-4 py-4 text-secondary-foreground">
            <p className="font-medium">
              {seatsLabel(trip.booking.seats)} confirmés · {fcfa(trip.booking.amount)}
            </p>
            <Button variant="outline" disabled={busy} onClick={() => void run({ action: "cancel-booking" })}>
              Annuler ma réservation
            </Button>
          </div>
        ) : null}

        {open ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">{seatsLabel(seats)}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label="Retirer un siège" onClick={() => setSeats((count) => Math.max(1, count - 1))}>
                  −
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Ajouter un siège"
                  onClick={() => setSeats((count) => Math.min(trip.seatsLeft, count + 1))}
                >
                  +
                </Button>
              </div>
            </div>
            <PayPicker value={method} onChange={setMethod} balance={me?.balance ?? 0} />
            <Button size="xl" disabled={busy} onClick={() => void run({ action: "book", seats, method })}>
              {busy ? "Réservation…" : `Réserver · ${fcfa(amount)}`}
            </Button>
          </div>
        ) : null}

        {trip.mine && (trip.status === "published" || trip.status === "full") ? (
          <Button variant="destructive" size="lg" disabled={busy} onClick={() => void run({ action: "cancel-trip" })}>
            Annuler ce départ
          </Button>
        ) : null}

        {!open && !trip.booking && !trip.mine ? (
          <p className="text-sm text-muted-foreground">Ce départ n’accepte plus de réservation.</p>
        ) : null}
      </div>
    </div>
  )
}
