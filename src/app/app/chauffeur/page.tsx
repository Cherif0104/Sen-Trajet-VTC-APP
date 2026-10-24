"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/client"
import { CATEGORIES } from "@/lib/domain"
import type { RideDTO } from "@/lib/dto"
import { fcfa, formatMinutes } from "@/lib/format"

type Desk = {
  kyc: string
  online: boolean
  vehicle: string
  plate: string
  category: keyof typeof CATEGORIES
  earningsToday: number
  zones: { name: string; level: string }[]
  offer: RideDTO | null
  active: RideDTO | null
}

export default function DriverPage() {
  const [desk, setDesk] = useState<Desk | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let stop = false
    async function pull() {
      try {
        const next = await api<Desk>("/api/driver")
        if (!stop) {
          setDesk(next)
          setError(null)
        }
      } catch (caught) {
        if (!stop) setError(caught instanceof Error ? caught.message : "Poste indisponible.")
      }
    }
    void pull()
    const poll = window.setInterval(() => void pull(), 3000)
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      stop = true
      window.clearInterval(poll)
      window.clearInterval(clock)
    }
  }, [])

  const online = desk?.online ?? false
  useEffect(() => {
    if (!online || !navigator.geolocation) return
    let last = 0
    const watch = navigator.geolocation.watchPosition((position) => {
      const at = Date.now()
      if (at - last < 8000) return
      last = at
      void api("/api/driver", {
        method: "POST",
        body: JSON.stringify({
          action: "location",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      }).catch(() => undefined)
    })
    return () => navigator.geolocation.clearWatch(watch)
  }, [online])

  async function act(action: string, extra?: { rating?: number }) {
    setBusy(true)
    try {
      setDesk(await api<Desk>("/api/driver", { method: "POST", body: JSON.stringify({ action, ...extra }) }))
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Action impossible.")
    } finally {
      setBusy(false)
    }
  }

  if (error && !desk) {
    return (
      <div className="flex flex-col gap-4 px-4 py-8">
        <h1 className="font-display text-4xl">Poste chauffeur</h1>
        <p className="text-muted-foreground">{error}</p>
        <Link href="/app/compte" className={buttonVariants({ size: "xl" })}>
          Activer mon véhicule
        </Link>
      </div>
    )
  }

  if (!desk) {
    return <p className="px-4 py-8 text-muted-foreground">Ouverture du poste…</p>
  }

  const left = desk.offer?.offerExpiresAt
    ? Math.max(0, Math.ceil((new Date(desk.offer.offerExpiresAt).getTime() - now) / 1000))
    : null

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">
            {desk.kyc !== "verified" ? "Dossier en revue" : desk.online ? "En ligne" : "Hors ligne"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {CATEGORIES[desk.category].label} · {desk.vehicle} · {desk.plate}
          </p>
        </div>
        <Switch
          checked={desk.online}
          disabled={busy || desk.kyc !== "verified"}
          onCheckedChange={(checked) => void act(checked ? "online" : "offline")}
        />
      </div>
      {desk.kyc !== "verified" ? (
        <p className="text-sm text-muted-foreground">On vérifie le véhicule. La mise en ligne attend la validation.</p>
      ) : null}

      <div className="rounded-3xl border border-border bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">Net du jour, heure de Dakar</p>
        <p className="font-display text-4xl tabular-nums">{fcfa(desk.earningsToday)}</p>
        <p className="mt-2 text-sm text-muted-foreground">Espèces et solde. Wave n’est pas branché.</p>
      </div>

      {desk.offer ? (
        <section className="flex flex-col gap-3 rounded-3xl border border-foreground bg-card px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Demande</p>
            <p className="text-sm text-muted-foreground">{left != null ? `${left} s` : ""}</p>
          </div>
          <p>
            {desk.offer.pickup.label} → {desk.offer.dropoff.label}
          </p>
          <p className="text-sm text-muted-foreground">
            {desk.offer.rider.name} · {desk.offer.rider.rating.toFixed(1).replace(".", ",")} · {fcfa(desk.offer.fare)}
            {desk.offer.net != null ? ` · vous gardez ${fcfa(desk.offer.net)}` : ""}
          </p>
          <Button size="xl" disabled={busy} onClick={() => void act("accept")}>
            Accepter
          </Button>
          <Button variant="outline" size="lg" disabled={busy} onClick={() => void act("decline")}>
            Refuser
          </Button>
        </section>
      ) : null}

      {desk.active ? (
        <section className="flex flex-col gap-3 rounded-3xl bg-card px-4 py-4">
          <p className="font-medium">
            {desk.active.pickup.label} → {desk.active.dropoff.label}
          </p>
          <p className="text-sm text-muted-foreground">
            {desk.active.status === "accepted" && desk.active.etaS != null
              ? `Arrivée estimée ${formatMinutes(desk.active.etaS)}`
              : desk.active.rider.name}
          </p>
          {desk.active.rider.phone ? (
            <a href={`tel:${desk.active.rider.phone}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
              Appeler {desk.active.rider.name}
            </a>
          ) : null}
          {desk.active.status === "accepted" ? (
            <Button size="xl" disabled={busy} onClick={() => void act("arrive")}>
              Je suis au point
            </Button>
          ) : null}
          {desk.active.status === "arrived" ? (
            <Button size="xl" disabled={busy} onClick={() => void act("start")}>
              Le passager est monté
            </Button>
          ) : null}
          {desk.active.status === "in_progress" ? (
            <Button size="xl" disabled={busy} onClick={() => void act("complete")}>
              Terminer et encaisser
            </Button>
          ) : null}
          <Link href={`/app/course/${desk.active.id}`} className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Ouvrir la carte
          </Link>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Demande habituelle à cette heure</h2>
        <ul className="flex flex-col gap-2">
          {desk.zones.map((zone) => (
            <li key={zone.name} className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm">
              <span>{zone.name}</span>
              <span className="text-muted-foreground">{zone.level}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
