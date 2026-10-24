"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/client"
import type { ActivityDTO } from "@/lib/dto"
import { fcfa, formatWhen, rideStatusLabel, seatsLabel } from "@/lib/format"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

export default function ActivityPage() {
  const [data, setData] = useState<ActivityDTO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    void api<ActivityDTO>("/api/activity")
      .then(setData)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Activité indisponible."))
  }, [])

  if (error) {
    return <p className="px-4 py-8 text-muted-foreground">{error}</p>
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-3 px-4 py-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    )
  }

  const upcoming = data.bookings.filter(
    (item) => item.status === "confirmed" && new Date(item.departAt).getTime() > now,
  )
  const pastBookings = data.bookings.filter((item) => !upcoming.includes(item))
  const empty = data.rides.length === 0 && data.bookings.length === 0 && data.published.length === 0

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-4xl">Activité</h1>
      {empty ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Rien pour l’instant</EmptyTitle>
            <EmptyDescription>Une course ou un siège apparaîtra ici dès qu’il est confirmé.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {upcoming.length > 0 ? (
        <Section title="Sièges à venir">
          {upcoming.map((item) => (
            <Link key={item.id} href={`/app/covoiturage/${item.carpoolId}`} className="flex flex-col rounded-2xl border border-border bg-card px-4 py-3">
              <span className="font-medium">
                {item.origin} → {item.destination}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatWhen(item.departAt)} · {seatsLabel(item.seats)} · {fcfa(item.amount)}
              </span>
            </Link>
          ))}
        </Section>
      ) : null}

      {data.rides.length > 0 ? (
        <Section title="Courses">
          {data.rides.map((ride) => (
            <Link key={ride.id} href={`/app/course/${ride.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
              <span>
                <span className="block font-medium">
                  {ride.pickup.label} → {ride.dropoff.label}
                </span>
                <span className="text-sm text-muted-foreground">{rideStatusLabel(ride.status)}</span>
              </span>
              <span className="text-sm">{fcfa(ride.viewer === "driver" && ride.net != null ? ride.net : ride.fare)}</span>
            </Link>
          ))}
        </Section>
      ) : null}

      {data.published.length > 0 ? (
        <Section title="Départs publiés">
          {data.published.map((trip) => (
            <Link key={trip.id} href={`/app/covoiturage/${trip.id}`} className="flex flex-col rounded-2xl bg-card px-4 py-3">
              <span className="font-medium">
                {trip.origin.label} → {trip.destination.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatWhen(trip.departAt)} · {trip.status} · {seatsLabel(trip.seatsLeft)} libres
              </span>
            </Link>
          ))}
        </Section>
      ) : null}

      {pastBookings.length > 0 ? (
        <Section title="Réservations passées">
          {pastBookings.map((item) => (
            <Link key={item.id} href={`/app/covoiturage/${item.carpoolId}`} className="flex flex-col rounded-2xl bg-muted px-4 py-3 text-sm">
              <span>
                {item.origin} → {item.destination}
              </span>
              <span className="text-muted-foreground">
                {item.status}
                {item.refund ? ` · remboursé ${fcfa(item.refund)}` : ""}
              </span>
            </Link>
          ))}
        </Section>
      ) : null}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}
