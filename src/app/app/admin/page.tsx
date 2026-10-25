"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { api } from "@/lib/client"
import { CATEGORIES, type CategoryId, type Tariff } from "@/lib/domain"
import { fcfa, formatWhen } from "@/lib/format"

type Desk = {
  rides: {
    id: string
    status: string
    category: string
    pickup: string
    dropoff: string
    fare: number
    createdAt: string
  }[]
  drivers: { id: string; name: string; phone: string; plate: string; vehicle: string; category: string }[]
  tariff: Tariff
  disputes: { id: string; pickup: string; dropoff: string; reason: string; by: string; fare: number; method: string }[]
}

const statusLabel: Record<string, string> = {
  matching: "Recherche",
  accepted: "En approche",
  arrived: "Au point",
  in_progress: "En course",
}

export default function AdminPage() {
  const [desk, setDesk] = useState<Desk | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [tariff, setTariff] = useState<Tariff | null>(null)

  useEffect(() => {
    let stop = false
    async function pull() {
      try {
        const next = await api<Desk>("/api/admin")
        if (!stop) {
          setDesk(next)
          setTariff((current) => current ?? next.tariff)
          setError(null)
        }
      } catch (caught) {
        if (!stop) setError(caught instanceof Error ? caught.message : "Accès refusé.")
      }
    }
    void pull()
    const poll = window.setInterval(() => void pull(), 5000)
    return () => {
      stop = true
      window.clearInterval(poll)
    }
  }, [])

  async function approve(userId: string) {
    setBusy(userId)
    try {
      setDesk(await api<Desk>("/api/admin", { method: "POST", body: JSON.stringify({ action: "approve", userId }) }))
      toast.success("Chauffeur validé.")
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Validation impossible.")
    } finally {
      setBusy(null)
    }
  }

  if (error && !desk) {
    return (
      <div className="flex flex-col gap-4 px-4 py-8">
        <h1 className="font-display text-4xl">Exploitation</h1>
        <p className="text-muted-foreground">{error}</p>
        <Link href="/app/compte" className={buttonVariants({ size: "lg" })}>
          Retour au compte
        </Link>
      </div>
    )
  }

  if (!desk) return <p className="px-4 py-8 text-muted-foreground">Ouverture…</p>

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <h1 className="font-display text-4xl">Exploitation</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Courses en cours</h2>
        {desk.rides.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune course ouverte.</p>
        ) : (
          desk.rides.map((ride) => (
            <Link key={ride.id} href={`/app/course/${ride.id}`} className="rounded-2xl bg-muted px-4 py-3">
              <span className="block font-medium">
                {statusLabel[ride.status] ?? ride.status} · {fcfa(ride.fare)}
              </span>
              <span className="text-sm text-muted-foreground">
                {ride.pickup} → {ride.dropoff} · {formatWhen(ride.createdAt)}
              </span>
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Dossiers en revue</h2>
        {desk.drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Personne en attente.</p>
        ) : (
          desk.drivers.map((driver) => (
            <div key={driver.id} className="flex flex-col gap-3 rounded-2xl bg-muted px-4 py-3">
              <div>
                <p className="font-medium">{driver.name}</p>
                <p className="text-sm text-muted-foreground">
                  {CATEGORIES[driver.category as CategoryId]?.label ?? driver.category} · {driver.vehicle} · {driver.plate}
                </p>
                <p className="text-sm text-muted-foreground">{driver.phone}</p>
              </div>
              <Button size="lg" disabled={busy === driver.id} onClick={() => void approve(driver.id)}>
                Valider
              </Button>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Zones et prix</h2>
        <p className="text-sm text-muted-foreground">
          La grille nationale et les sièges. Ces montants restent des hypothèses tant qu’ils ne sont pas signés.
        </p>
        {tariff ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              setBusy("tariff")
              void api<Desk>("/api/admin", { method: "POST", body: JSON.stringify({ action: "tariff", tariff }) })
                .then((next) => {
                  setDesk(next)
                  setTariff(next.tariff)
                  toast.success("Grille enregistrée.")
                })
                .catch((caught: unknown) => toast.error(caught instanceof Error ? caught.message : "Enregistrement impossible."))
                .finally(() => setBusy(null))
            }}
          >
            {(["eco", "confort", "confort_plus"] as const).map((id) => (
              <div key={id} className="grid grid-cols-2 gap-2 rounded-2xl bg-muted px-4 py-3">
                <p className="col-span-2 font-medium">{CATEGORIES[id].label}</p>
                <label className="text-sm text-muted-foreground">
                  Base
                  <input
                    className="mt-1 w-full rounded-full bg-background px-3 py-2 text-foreground"
                    inputMode="numeric"
                    value={tariff[id].base}
                    onChange={(event) =>
                      setTariff({ ...tariff, [id]: { ...tariff[id], base: Number(event.target.value) } })
                    }
                  />
                </label>
                <label className="text-sm text-muted-foreground">
                  FCFA / km
                  <input
                    className="mt-1 w-full rounded-full bg-background px-3 py-2 text-foreground"
                    inputMode="numeric"
                    value={tariff[id].perKm}
                    onChange={(event) =>
                      setTariff({ ...tariff, [id]: { ...tariff[id], perKm: Number(event.target.value) } })
                    }
                  />
                </label>
                <label className="col-span-2 text-sm text-muted-foreground">
                  Commission, de 0 à 0,5
                  <input
                    className="mt-1 w-full rounded-full bg-background px-3 py-2 text-foreground"
                    inputMode="decimal"
                    value={tariff[id].commission}
                    onChange={(event) =>
                      setTariff({ ...tariff, [id]: { ...tariff[id], commission: Number(event.target.value) } })
                    }
                  />
                </label>
              </div>
            ))}
            <label className="text-sm text-muted-foreground">
              Forfait aéroport, FCFA
              <input
                className="mt-1 w-full rounded-full bg-background px-3 py-2 text-foreground"
                inputMode="numeric"
                value={tariff.airportFee}
                onChange={(event) => setTariff({ ...tariff, airportFee: Number(event.target.value) })}
              />
            </label>
            {tariff.corridors.map((corridor, index) => (
              <label key={`${corridor.a}-${corridor.b}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="capitalize">
                  {corridor.a} ↔ {corridor.b}
                </span>
                <input
                  className="w-28 rounded-full bg-muted px-3 py-2 text-right"
                  inputMode="numeric"
                  value={corridor.price}
                  onChange={(event) => {
                    const corridors = tariff.corridors.slice()
                    corridors[index] = { ...corridor, price: Number(event.target.value) }
                    setTariff({ ...tariff, corridors })
                  }}
                />
              </label>
            ))}
            <Button type="submit" size="lg" disabled={busy === "tariff"}>
              Enregistrer la zone
            </Button>
          </form>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Annulations</h2>
        {desk.disputes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Rien à trancher.</p>
        ) : (
          desk.disputes.map((item) => (
            <div key={item.id} className="rounded-2xl bg-muted px-4 py-3 text-sm">
              <p className="font-medium">
                {item.pickup} → {item.dropoff}
              </p>
              <p className="text-muted-foreground">
                {item.by || "système"} · {item.method} · {fcfa(item.fare)}
              </p>
              {item.reason ? <p className="mt-1">{item.reason}</p> : null}
            </div>
          ))
        )}
      </section>
    </div>
  )
}
