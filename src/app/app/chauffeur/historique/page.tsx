"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/client"
import { CATEGORIES } from "@/lib/domain"
import type { ActivityDTO } from "@/lib/dto"
import { fcfa, formatWhen, rideStatusLabel } from "@/lib/format"

export default function DriverHistoryPage() {
  const [data, setData] = useState<ActivityDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api<ActivityDTO>("/api/activity")
      .then(setData)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Historique indisponible."))
  }, [])

  if (error) return <p className="px-4 py-8 text-muted-foreground">{error}</p>
  if (!data) {
    return (
      <div className="flex flex-col gap-3 px-4 py-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    )
  }

  const rides = data.rides.filter((ride) => ride.viewer === "driver")
  const done = rides.filter((ride) => ride.status === "completed")
  const net = done.reduce((sum, ride) => sum + (ride.net ?? 0), 0)

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="font-display text-4xl">Historique</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tes 20 dernières courses.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-3xl bg-card px-4 py-4">
          <p className="text-sm text-muted-foreground">Courses terminées</p>
          <p className="font-display text-3xl tabular-nums">{done.length}</p>
        </div>
        <div className="rounded-3xl bg-card px-4 py-4">
          <p className="text-sm text-muted-foreground">Net gagné</p>
          <p className="font-display text-3xl tabular-nums">{fcfa(net)}</p>
        </div>
      </div>

      {rides.length === 0 ? (
        <Empty className="rounded-3xl bg-card">
          <EmptyHeader>
            <EmptyTitle>Pas encore de course</EmptyTitle>
            <EmptyDescription>Passe en ligne depuis l’onglet Courses. Chaque course terminée apparaîtra ici.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {rides.map((ride) => (
            <li key={ride.id}>
              <Link href={`/app/course/${ride.id}`} className="flex flex-col gap-1 rounded-2xl bg-card px-4 py-3">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate font-medium">
                    {ride.pickup.label} → {ride.dropoff.label}
                  </span>
                  <span className="shrink-0 tabular-nums">{fcfa(ride.fare)}</span>
                </span>
                <span className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span className="truncate">
                    {rideStatusLabel(ride.status)} · {CATEGORIES[ride.category].label} · {ride.rider.name} ·{" "}
                    {formatWhen(ride.createdAt)}
                  </span>
                  {ride.status === "completed" && ride.net != null ? (
                    <span className="shrink-0 tabular-nums">net {fcfa(ride.net)}</span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ride.paymentMethod === "cash" ? "Espèces encaissées par toi" : "Payée par solde"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
