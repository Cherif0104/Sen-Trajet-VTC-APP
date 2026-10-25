"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { api } from "@/lib/client"
import { CATEGORIES, DRIVER_DOCUMENTS, type CategoryId, type Tariff } from "@/lib/domain"
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
  drivers: {
    id: string
    name: string
    phone: string
    email: string
    plate: string
    vehicle: string
    year: number
    category: string
    licenseNumber: string
    licenseExpiry: string
    submittedAt: string | null
    documents: { kind: string; dataUrl: string }[]
  }[]
  fleet: {
    id: string
    name: string
    phone: string
    plate: string
    category: string
    online: boolean
    balance: number
    blocked: boolean
  }[]
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

  async function act(userId: string, action: string, extra: Record<string, unknown>, done: string) {
    setBusy(userId)
    try {
      setDesk(await api<Desk>("/api/admin", { method: "POST", body: JSON.stringify({ action, userId, ...extra }) }))
      toast.success(done)
      return true
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Action impossible.")
      return false
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

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Dossiers chauffeur</h2>
        {desk.drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun dossier en attente.</p>
        ) : (
          desk.drivers.map((driver) => (
            <DriverReview key={driver.id} driver={driver} busy={busy === driver.id} act={act} />
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Flotte et soldes</h2>
        <p className="text-sm text-muted-foreground">
          Les plus endettés en premier. Plafond actuel : {fcfa(desk.tariff.debtLimit)}.
        </p>
        {desk.fleet.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun chauffeur validé.</p>
        ) : (
          desk.fleet.map((driver) => <FleetRow key={driver.id} driver={driver} busy={busy === driver.id} act={act} />)
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
              Plafond de dette chauffeur, FCFA
              <input
                className="mt-1 w-full rounded-full bg-background px-3 py-2 text-foreground"
                inputMode="numeric"
                value={tariff.debtLimit}
                onChange={(event) => setTariff({ ...tariff, debtLimit: Number(event.target.value) })}
              />
            </label>
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

type Act = (userId: string, action: string, extra: Record<string, unknown>, done: string) => Promise<boolean>

function DriverReview({ driver, busy, act }: { driver: Desk["drivers"][number]; busy: boolean; act: Act }) {
  const [refusing, setRefusing] = useState(false)
  const [reason, setReason] = useState("")
  const [zoom, setZoom] = useState<string | null>(null)
  const expired = driver.licenseExpiry !== "" && driver.licenseExpiry < new Date().toISOString().slice(0, 10)
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-muted px-4 py-4">
      <div>
        <p className="font-medium">{driver.name}</p>
        <p className="text-sm text-muted-foreground">
          {driver.phone} · {driver.email}
        </p>
        <p className="text-sm text-muted-foreground">
          {CATEGORIES[driver.category as CategoryId]?.label ?? driver.category} · {driver.vehicle} {driver.year || ""} ·{" "}
          {driver.plate}
        </p>
        <p className={expired ? "text-sm text-accent" : "text-sm text-muted-foreground"}>
          Permis {driver.licenseNumber || "?"} · jusqu’au {driver.licenseExpiry || "?"}
          {expired ? " · expiré" : ""}
        </p>
        {driver.submittedAt ? (
          <p className="text-sm text-muted-foreground">Envoyé {formatWhen(driver.submittedAt)}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {DRIVER_DOCUMENTS.map((doc) => {
          const file = driver.documents.find((item) => item.kind === doc.id)
          return (
            <button
              key={doc.id}
              type="button"
              disabled={!file}
              onClick={() => setZoom(file?.dataUrl ?? null)}
              className="flex flex-col gap-1 text-left text-xs text-muted-foreground"
            >
              <span className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-background">
                {file ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.dataUrl} alt={doc.label} className="size-full object-cover" />
                ) : (
                  "Absente"
                )}
              </span>
              {doc.label}
            </button>
          )
        })}
      </div>
      {zoom ? (
        <button type="button" onClick={() => setZoom(null)} className="overflow-hidden rounded-2xl bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Pièce agrandie" className="max-h-[70svh] w-full object-contain" />
        </button>
      ) : null}
      {refusing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void act(driver.id, "reject", { reason }, "Dossier renvoyé au chauffeur.")
          }}
        >
          <Input
            size="lg"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex. Photo du permis floue, reprends-la en plein jour."
            minLength={5}
            required
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="lg" onClick={() => setRefusing(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="outline" size="lg" className="flex-1" disabled={busy}>
              Envoyer le motif
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="lg" disabled={busy} onClick={() => setRefusing(true)}>
            Refuser
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={busy || driver.documents.length < DRIVER_DOCUMENTS.length}
            onClick={() => void act(driver.id, "approve", {}, "Chauffeur validé.")}
          >
            Valider
          </Button>
        </div>
      )}
    </div>
  )
}

function FleetRow({ driver, busy, act }: { driver: Desk["fleet"][number]; busy: boolean; act: Act }) {
  const [amount, setAmount] = useState("")
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-muted px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {driver.name}
            {driver.online ? <span className="ml-2 text-xs text-emerald-400">en ligne</span> : null}
          </p>
          <p className="text-sm text-muted-foreground">
            {CATEGORIES[driver.category as CategoryId]?.label ?? driver.category} · {driver.plate} · {driver.phone}
          </p>
        </div>
        <div className="text-right">
          <p className={driver.balance < 0 ? "font-medium text-accent tabular-nums" : "font-medium tabular-nums"}>
            {fcfa(driver.balance)}
          </p>
          {driver.blocked ? <p className="text-xs text-accent">bloqué</p> : null}
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void act(driver.id, "deposit", { amount: Number(amount) }, "Solde crédité.").then((ok) => {
            if (ok) setAmount("")
          })
        }}
      >
        <Input
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="Dépôt agence, FCFA"
          aria-label={`Dépôt pour ${driver.name}`}
          required
        />
        <Button type="submit" variant="secondary" disabled={busy || !amount}>
          Créditer
        </Button>
      </form>
    </div>
  )
}
