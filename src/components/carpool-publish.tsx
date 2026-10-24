"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FocusBar } from "@/components/focus-bar"
import { PlaceField } from "@/components/place-field"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/client"
import { carpoolQuery } from "@/lib/carpool-query"
import type { CarpoolDTO } from "@/lib/dto"
import { AMENITY_LABELS, fcfa, seatsLabel } from "@/lib/format"
import { placeById, toPoint, type GeoPoint } from "@/lib/places"
import { cn } from "cn"

const amenityIds = Object.keys(AMENITY_LABELS)

function minLocal() {
  return new Date(Date.now() + 40 * 60 * 1000).toISOString().slice(0, 16)
}

export function CarpoolPublish() {
  const router = useRouter()
  const originDefault = placeById("baux")
  const destDefault = placeById("thies")
  const [step, setStep] = useState(0)
  const [origin, setOrigin] = useState<GeoPoint | null>(originDefault ? toPoint(originDefault) : null)
  const [destination, setDestination] = useState<GeoPoint | null>(destDefault ? toPoint(destDefault) : null)
  const [depart, setDepart] = useState(
    () => new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString().slice(0, 11) + "07:30",
  )
  const [seats, setSeats] = useState(3)
  const [price, setPrice] = useState(2000)
  const [suggested, setSuggested] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [amenities, setAmenities] = useState<string[]>(["clim"])
  const [serene, setSerene] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!origin || !destination) return
    void api<{ price: number }>(`/api/carpools?suggest=1&${carpoolQuery(origin, destination)}`)
      .then((data) => {
        setSuggested(data.price)
        setPrice(data.price)
      })
      .catch(() => setSuggested(null))
  }, [origin, destination])

  async function publish() {
    if (!origin || !destination) return
    setBusy(true)
    try {
      const trip = await api<CarpoolDTO>("/api/carpools", {
        method: "POST",
        body: JSON.stringify({
          origin,
          destination,
          departAt: new Date(`${depart}:00.000Z`).toISOString(),
          seats,
          price,
          notes,
          amenities,
          serene,
        }),
      })
      router.push(`/app/covoiturage/${trip.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publication impossible.")
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <FocusBar title="Publier" back="/app/covoiturage" />
      <p className="text-sm text-muted-foreground">Trois étapes. Le prix reste dans la fourchette du corridor.</p>
      {step === 0 ? (
        <div className="flex flex-col gap-4">
          <PlaceField label="Départ" value={origin} onChange={setOrigin} onClear={() => setOrigin(null)} placeholder="Où vous prenez les passagers" />
          <PlaceField label="Arrivée" value={destination} onChange={setDestination} onClear={() => setDestination(null)} placeholder="Où vous les déposez" />
          <Button size="xl" disabled={!origin || !destination} onClick={() => setStep(1)}>
            Continuer
          </Button>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="depart">Départ, heure de Dakar</FieldLabel>
            <Input id="depart" type="datetime-local" size="lg" value={depart} min={minLocal()} onChange={(event) => setDepart(event.target.value)} />
          </Field>
          <div className="flex items-center justify-between">
            <span>{seatsLabel(seats)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" aria-label="Moins de sièges" onClick={() => setSeats((count) => Math.max(1, count - 1))}>
                −
              </Button>
              <Button variant="outline" size="icon" aria-label="Plus de sièges" onClick={() => setSeats((count) => Math.min(6, count + 1))}>
                +
              </Button>
            </div>
          </div>
          <Field>
            <FieldLabel htmlFor="price">Prix par siège</FieldLabel>
            <Input
              id="price"
              size="lg"
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(Number(event.target.value.replace(/\D/g, "")) || 0)}
            />
          </Field>
          {suggested ? (
            <p className="text-sm text-muted-foreground">
              Suggestion {fcfa(suggested)}. Sen Trajet accepte entre {fcfa(Math.round(suggested * 0.6))} et {fcfa(Math.round(suggested * 1.7))}.
            </p>
          ) : null}
          <Button size="xl" onClick={() => setStep(2)}>
            Continuer
          </Button>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {amenityIds.map((id) => {
              const on = amenities.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  className={cn("rounded-full border px-3 py-1.5 text-sm", on ? "border-foreground bg-foreground text-background" : "border-border")}
                  onClick={() =>
                    setAmenities((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
                  }
                >
                  {AMENITY_LABELS[id]}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
            <span>
              <span className="block font-medium">Trajet Serein</span>
              <span className="block text-sm opacity-80">Réservé aux passagères, conductrice au volant.</span>
            </span>
            <Switch checked={serene} onCheckedChange={setSerene} aria-label="Trajet Serein" />
          </div>
          <Field>
            <FieldLabel htmlFor="notes">Note aux passagers</FieldLabel>
            <textarea
              id="notes"
              value={notes}
              maxLength={240}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Heure pile, une valise, pause à Louga…"
              className="min-h-24 rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
          <Button size="xl" disabled={busy} onClick={() => void publish()}>
            {busy ? "Publication…" : `Publier · ${fcfa(price)} le siège`}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
