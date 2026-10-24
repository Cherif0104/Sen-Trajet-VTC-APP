"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { FleetBadge } from "@/components/demo-indicator"
import { PlaceField } from "@/components/place-field"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/client"
import { carpoolQuery } from "@/lib/carpool-query"
import type { CarpoolDTO } from "@/lib/dto"
import { AMENITY_LABELS, dakarOffsetDate, fcfa, formatDay, formatTime, seatsLabel } from "@/lib/format"
import { placeById, toPoint, type GeoPoint } from "@/lib/places"

export function CarpoolSearch({ fromId, toId, date }: { fromId?: string; toId?: string; date?: string }) {
  const originPlace = placeById(fromId ?? "baux")
  const destPlace = placeById(toId ?? "thies")
  const [origin, setOrigin] = useState<GeoPoint | null>(originPlace ? toPoint(originPlace) : null)
  const [destination, setDestination] = useState<GeoPoint | null>(destPlace ? toPoint(destPlace) : null)
  const [day, setDay] = useState(date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dakarOffsetDate(1))
  const [seats, setSeats] = useState(1)
  const [trips, setTrips] = useState<CarpoolDTO[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!origin || !destination) return
    const timer = window.setTimeout(() => {
      setLoading(true)
      void api<{ trips: CarpoolDTO[] }>(
        `/api/carpools?${carpoolQuery(origin, destination, { date: day, seats: String(seats) })}`,
      )
        .then((data) => setTrips(data.trips))
        .catch((error: unknown) => {
          setTrips([])
          toast.error(error instanceof Error ? error.message : "Recherche impossible.")
        })
        .finally(() => setLoading(false))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [origin, destination, day, seats])

  const days = [0, 1, 2].map((offset) => dakarOffsetDate(offset))

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Sièges</h1>
          <p className="text-sm text-muted-foreground">Le départ part à l’heure, même s’il reste des places.</p>
        </div>
        <Link href="/app/covoiturage/publier" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Publier
        </Link>
      </div>
      <PlaceField label="Départ" value={origin} onChange={setOrigin} onClear={() => setOrigin(null)} placeholder="Gare des Baux…" />
      <PlaceField label="Arrivée" value={destination} onChange={setDestination} onClear={() => setDestination(null)} placeholder="Thiès, Mbour, Touba…" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {days.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDay(value)}
              className={`rounded-full px-3 py-1.5 text-sm ${day === value ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
            >
              {formatDay(value)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSeats((count) => Math.max(1, count - 1))} aria-label="Moins de sièges">
            −
          </Button>
          <span className="w-16 text-center text-sm">{seatsLabel(seats)}</span>
          <Button variant="outline" size="icon" onClick={() => setSeats((count) => Math.min(6, count + 1))} aria-label="Plus de sièges">
            +
          </Button>
        </div>
      </div>

      {loading || trips == null ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
      ) : trips.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Aucun siège sur ce créneau</EmptyTitle>
            <EmptyDescription>Essayez le lendemain, ou publiez votre propre départ.</EmptyDescription>
          </EmptyHeader>
          <Link href="/app/covoiturage/publier" className={buttonVariants({ size: "lg" })}>
            Publier un départ
          </Link>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link href={`/app/covoiturage/${trip.id}`} className="flex flex-col gap-2 rounded-3xl bg-card px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {formatTime(trip.departAt)} · {trip.origin.city} → {trip.destination.city}
                  </span>
                  <span>{fcfa(trip.pricePerSeat)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {trip.driver.name} · {trip.driver.color} {trip.driver.make} {trip.driver.model} · {seatsLabel(trip.seatsLeft)} libres
                </p>
                <div className="flex flex-wrap gap-1">
                  {trip.serene ? <Badge variant="secondary">Serein</Badge> : null}
                  <FleetBadge launchFleet={trip.driver.launchFleet} />
                  {trip.amenities.slice(0, 3).map((item) => (
                    <Badge key={item} variant="outline">
                      {AMENITY_LABELS[item] ?? item}
                    </Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
