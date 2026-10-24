"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FocusBar } from "@/components/focus-bar"
import { PayPicker } from "@/components/pay-picker"
import { PlaceField } from "@/components/place-field"
import { RideMap } from "@/components/ride-map"
import { useMe } from "@/components/use-me"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/client"
import type { Quote, PayMethod } from "@/lib/domain"
import type { RideDTO } from "@/lib/dto"
import { fcfa, formatKm, formatMinutes } from "@/lib/format"
import { placeById, POPULAR_IDS, toPoint, type GeoPoint } from "@/lib/places"
import { cn } from "cn"

type FareQuote = Quote & { sereneAvailable: boolean }

const steps = ["Trajet", "Véhicule", "Paiement"]

export function BookRide({ fromId, toId }: { fromId?: string; toId?: string }) {
  const router = useRouter()
  const { me } = useMe()
  const initialPickup = placeById(fromId ?? "sacre-coeur")
  const initialDropoff = toId ? placeById(toId) : null
  const [pickup, setPickup] = useState<GeoPoint | null>(initialPickup ? toPoint(initialPickup) : null)
  const [dropoff, setDropoff] = useState<GeoPoint | null>(initialDropoff ? toPoint(initialDropoff) : null)
  const [step, setStep] = useState(0)
  const [quotes, setQuotes] = useState<FareQuote[] | null>(null)
  const [distanceM, setDistanceM] = useState(0)
  const [durationS, setDurationS] = useState(0)
  const [quoting, setQuoting] = useState(false)
  const [category, setCategory] = useState("eco")
  const [serene, setSerene] = useState(false)
  const [method, setMethod] = useState<PayMethod>("wave")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (fromId) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords
      if (latitude < 12 || latitude > 17 || longitude < -18 || longitude > -11) return
      setPickup({ label: "Ma position", city: "Dakar", lat: latitude, lng: longitude })
    })
  }, [fromId])

  useEffect(() => {
    if (!pickup || !dropoff) return
    const timer = window.setTimeout(() => {
      setQuoting(true)
      void api<{ distanceM: number; durationS: number; quotes: FareQuote[] }>("/api/fare", {
        method: "POST",
        body: JSON.stringify({ pickup, dropoff }),
      })
        .then((data) => {
          setQuotes(data.quotes)
          setDistanceM(data.distanceM)
          setDurationS(data.durationS)
          setCategory((current) => {
            const still = data.quotes.find((quote) => quote.category === current && quote.available)
            return still?.category ?? data.quotes.find((quote) => quote.available)?.category ?? current
          })
        })
        .catch((error: unknown) => {
          setQuotes(null)
          toast.error(error instanceof Error ? error.message : "Tarif indisponible.")
        })
        .finally(() => setQuoting(false))
    }, 220)
    return () => window.clearTimeout(timer)
  }, [pickup, dropoff])

  const shownQuotes = pickup && dropoff ? quotes : null
  const selected = useMemo(
    () => shownQuotes?.find((quote) => quote.category === category) ?? null,
    [shownQuotes, category],
  )
  const sereneBlocked = Boolean(serene && selected && !selected.sereneAvailable)
  const canPay =
    Boolean(selected?.available) &&
    !sereneBlocked &&
    (method !== "wallet" || (me?.balance ?? 0) >= (selected?.fare ?? Infinity))

  async function confirm() {
    if (!pickup || !dropoff || !selected?.fare) return
    setBusy(true)
    try {
      const ride = await api<RideDTO>("/api/rides", {
        method: "POST",
        body: JSON.stringify({ pickup, dropoff, category, method, serene }),
      })
      router.push(`/app/course/${ride.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La course n’a pas pu être créée.")
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col md:grid md:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="h-[42vh] min-h-56 md:h-dvh">
        <RideMap pickup={pickup} dropoff={dropoff} />
      </div>
      <div className="flex flex-1 flex-col gap-5 bg-background px-4 py-4 md:h-dvh md:overflow-y-auto">
        <FocusBar title="Course" />
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-full px-2 py-1.5 text-xs",
                  index === step ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
                onClick={() => {
                  if (index < step) setStep(index)
                }}
              >
                {index + 1}. {label}
              </button>
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <PlaceField label="Départ" value={pickup} onChange={setPickup} onClear={() => setPickup(null)} placeholder="Sacré-Cœur, Plateau…" />
            <PlaceField label="Arrivée" value={dropoff} onChange={setDropoff} onClear={() => setDropoff(null)} placeholder="Almadies, AIBD, Thiès…" />
            <div className="flex gap-2 overflow-x-auto">
              {POPULAR_IDS.slice(0, 6).map((id) => {
                const place = placeById(id)
                if (!place) return null
                return (
                  <button
                    key={id}
                    type="button"
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm"
                    onClick={() => setDropoff(toPoint(place))}
                  >
                    {place.area ?? place.city}
                  </button>
                )
              })}
            </div>
            {shownQuotes ? (
              <p className="text-sm text-muted-foreground">
                {formatKm(distanceM)} · {formatMinutes(durationS)}
              </p>
            ) : null}
            <Button size="xl" disabled={!pickup || !dropoff || quoting} onClick={() => setStep(1)}>
              {quoting ? "Calcul du prix…" : "Voir les véhicules"}
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-3">
            {quoting || !shownQuotes ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ) : (
              shownQuotes.map((quote) => (
                <button
                  key={quote.category}
                  type="button"
                  disabled={!quote.available}
                  onClick={() => setCategory(quote.category)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left",
                    category === quote.category ? "border-foreground bg-card" : "border-border bg-card",
                    !quote.available && "opacity-60",
                  )}
                >
                  <span>
                    <span className="block font-medium">{quote.label}</span>
                    <span className="block text-sm text-muted-foreground">
                      {quote.available
                        ? `${quote.detail}${quote.etaPickupS ? ` · ${formatMinutes(quote.etaPickupS)}` : ""}`
                        : quote.reason}
                    </span>
                  </span>
                  <span className="font-medium">{quote.fare ? fcfa(quote.fare) : "—"}</span>
                </button>
              ))
            )}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
              <span>
                <span className="block font-medium">Trajet Serein</span>
                <span className="block text-sm opacity-80">Conductrice uniquement. Sinon, Yoon le dit.</span>
              </span>
              <Switch checked={serene} onCheckedChange={setSerene} aria-label="Trajet Serein" />
            </div>
            {sereneBlocked ? (
              <p className="text-sm text-destructive">Aucune conductrice libre dans cette catégorie à proximité.</p>
            ) : null}
            {selected?.surgeLabel ? <p className="text-sm text-muted-foreground">{selected.surgeLabel}</p> : null}
            <Button size="xl" disabled={!selected?.available || sereneBlocked} onClick={() => setStep(2)}>
              Continuer
            </Button>
          </div>
        ) : null}

        {step === 2 && selected ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl bg-card px-4 py-4">
              <p className="text-sm text-muted-foreground">
                {selected.label}
                {serene ? " · Trajet Serein" : ""} · {pickup?.label} → {dropoff?.label}
              </p>
              <p className="font-display text-4xl">{selected.fare ? fcfa(selected.fare) : "—"}</p>
              <p className="text-sm text-muted-foreground">
                Wave, Orange Money et Free Money se confirment sans débit réel dans cette version d’essai.
              </p>
            </div>
            <PayPicker value={method} onChange={setMethod} balance={me?.balance ?? 0} />
            {method === "wallet" && selected.fare && (me?.balance ?? 0) < selected.fare ? (
              <p className="text-sm text-destructive">Solde insuffisant. Rechargez le portefeuille, ou payez avec Wave.</p>
            ) : null}
            <Button size="xl" disabled={!canPay || busy} onClick={() => void confirm()}>
              {busy ? "Confirmation…" : `Confirmer · ${selected.fare ? fcfa(selected.fare) : ""}`}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
