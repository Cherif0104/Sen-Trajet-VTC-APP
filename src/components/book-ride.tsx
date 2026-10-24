"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FareCard } from "@/components/fare-card"
import { FocusBar } from "@/components/focus-bar"
import { PayPicker } from "@/components/pay-picker"
import { PlaceField } from "@/components/place-field"
import { RideMap } from "@/components/ride-map"
import { useMe } from "@/components/use-me"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/client"
import { RIDE_CLASSES, type Quote, type PayMethod } from "@/lib/domain"
import type { RideDTO } from "@/lib/dto"
import { fcfa, formatKm, formatMinutes } from "@/lib/format"
import type { GeoPoint } from "@/lib/places"
import { cn } from "cn"

type FareQuote = Quote & { sereneAvailable: boolean }

const steps = ["Trajet", "Véhicule", "Paiement"]

const vehicleArt: Record<string, string> = {
  eco: "/vehicles/eco.jpg",
  confort: "/vehicles/confort.jpg",
  confort_plus: "/vehicles/confort-plus.jpg",
}

export function BookRide({
  initialPickup = null,
  initialDropoff = null,
}: {
  initialPickup?: GeoPoint | null
  initialDropoff?: GeoPoint | null
}) {
  const router = useRouter()
  const { me } = useMe()
  const [pickup, setPickup] = useState<GeoPoint | null>(initialPickup)
  const [dropoff, setDropoff] = useState<GeoPoint | null>(initialDropoff)
  const [step, setStep] = useState(initialPickup && initialDropoff ? 1 : 0)
  const [quotes, setQuotes] = useState<FareQuote[] | null>(null)
  const [distanceM, setDistanceM] = useState(0)
  const [durationS, setDurationS] = useState(0)
  const [quoting, setQuoting] = useState(false)
  const [category, setCategory] = useState("eco")
  const [serene, setSerene] = useState(false)
  const [method, setMethod] = useState<PayMethod>("cash")
  const [busy, setBusy] = useState(false)
  const pickupEdited = useRef(Boolean(initialPickup))

  useEffect(() => {
    if (initialPickup || pickupEdited.current) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => {
      if (pickupEdited.current) return
      const { latitude, longitude } = position.coords
      void api<{ place: GeoPoint | null }>(`/api/places?lat=${latitude}&lng=${longitude}`)
        .then((data) => {
          if (pickupEdited.current || !data.place) return
          setPickup(data.place)
        })
        .catch(() => undefined)
    })
  }, [initialPickup])

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
            const classes = data.quotes.filter((quote) => RIDE_CLASSES.includes(quote.category as (typeof RIDE_CLASSES)[number]))
            const still = classes.find((quote) => quote.category === current && quote.available)
            return still?.category ?? classes.find((quote) => quote.available)?.category ?? current
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
  const classes = shownQuotes?.filter((quote) => RIDE_CLASSES.includes(quote.category as (typeof RIDE_CLASSES)[number])) ?? null
  const selected = useMemo(
    () => classes?.find((quote) => quote.category === category) ?? null,
    [classes, category],
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
    <div className="relative min-h-dvh md:grid md:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="absolute inset-0 z-0 md:relative md:z-auto md:h-dvh">
        <RideMap pickup={pickup} dropoff={dropoff} />
      </div>
      <div className="absolute top-3 left-3 z-30 rounded-full bg-background/95 pr-3 backdrop-blur md:hidden">
        <FocusBar title="Course" />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[72vh] flex-col gap-4 overflow-y-auto rounded-t-[1.75rem] bg-white px-4 pt-3 pb-6 shadow-[0_-12px_40px_rgba(18,20,23,0.08)] md:relative md:inset-auto md:z-auto md:max-h-none md:h-dvh md:rounded-none md:shadow-none">
        <div className="mx-auto h-1 w-10 rounded-full bg-border md:hidden" />
        <div className="hidden md:block">
          <FocusBar title="Course" />
        </div>
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-full px-2 py-1.5 text-xs",
                  index === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
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
            <PlaceField
              label="Départ"
              value={pickup}
              onChange={(place) => {
                pickupEdited.current = true
                setPickup(place)
              }}
              onClear={() => {
                pickupEdited.current = true
                setPickup(null)
              }}
              placeholder="Ta position"
            />
            <PlaceField
              label="Arrivée"
              value={dropoff}
              onChange={setDropoff}
              onClear={() => setDropoff(null)}
              placeholder="Où tu vas"
            />
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
            {quoting || !classes ? (
              <Skeleton className="h-52 w-full rounded-3xl" />
            ) : (
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
                {classes.map((quote) => (
                  <button
                    key={quote.category}
                    type="button"
                    disabled={!quote.available}
                    onClick={() => setCategory(quote.category)}
                    className={cn(
                      "w-[78%] shrink-0 snap-center rounded-3xl border bg-white p-3 text-left",
                      category === quote.category ? "border-primary" : "border-border",
                      !quote.available && "opacity-60",
                    )}
                  >
                    <Image
                      src={vehicleArt[quote.category] ?? "/vehicles/eco.jpg"}
                      alt=""
                      width={640}
                      height={400}
                      className="h-36 w-full object-contain"
                    />
                    <span className="mt-2 flex items-end justify-between gap-2">
                      <span>
                        <span className="block font-medium">{quote.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {quote.available ? quote.detail : quote.reason}
                        </span>
                      </span>
                      <span className="text-lg font-semibold tabular-nums">{quote.fare ? fcfa(quote.fare) : "—"}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
              <span>
                <span className="block font-medium">Trajet Serein</span>
                <span className="block text-sm opacity-80">Conductrice seulement.</span>
              </span>
              <Switch checked={serene} onCheckedChange={setSerene} aria-label="Trajet Serein" />
            </div>
            {sereneBlocked ? <p className="text-sm text-destructive">Aucune conductrice libre près de toi.</p> : null}
            {selected?.surgeLabel ? <p className="text-sm text-muted-foreground">{selected.surgeLabel}</p> : null}
            <Button size="xl" disabled={!selected?.available || sereneBlocked} onClick={() => setStep(2)}>
              {selected ? `Choisir ${selected.label}` : "Continuer"}
            </Button>
          </div>
        ) : null}

        {step === 2 && selected ? (
          <div className="flex flex-col gap-4">
            <FareCard
              eyebrow={`${selected.label}${serene ? " · Trajet Serein" : ""}`}
              amount={selected.fare ? fcfa(selected.fare) : "—"}
              detail={`${pickup?.label ?? ""} → ${dropoff?.label ?? ""}`}
              note="Prix bloqué. Il ne bouge plus."
            />
            <PayPicker value={method} onChange={setMethod} balance={me?.balance ?? 0} />
            {method === "wallet" && selected.fare && (me?.balance ?? 0) < selected.fare ? (
              <p className="text-sm text-destructive">Solde trop bas. Passe en espèces.</p>
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
