"use client"

import { useEffect, useState } from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/client"
import type { GeoPoint, PlaceKind } from "@/lib/places"

const CHIPS: { id: PlaceKind | "tout"; label: string }[] = [
  { id: "tout", label: "Tout" },
  { id: "quartier", label: "Quartier" },
  { id: "pharmacie", label: "Pharmacie" },
  { id: "ecole", label: "École" },
  { id: "commerce", label: "Commerce" },
]

const KIND_LABEL: Record<PlaceKind, string> = {
  ville: "Ville",
  quartier: "Quartier",
  pharmacie: "Pharmacie",
  ecole: "École",
  commerce: "Commerce",
  rue: "Rue",
}

export function PlaceField({
  label,
  value,
  onChange,
  onClear,
  placeholder,
}: {
  label: string
  value: GeoPoint | null
  onChange: (place: GeoPoint) => void
  onClear?: () => void
  placeholder: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [places, setPlaces] = useState<GeoPoint[]>([])
  const [kind, setKind] = useState<PlaceKind | "tout">("tout")
  const query = draft ?? value?.label ?? ""

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      const filter = kind === "tout" ? "" : `&kind=${kind}`
      void api<{ places: GeoPoint[] }>(`/api/places?q=${encodeURIComponent(query)}${filter}`)
        .then((data) => setPlaces(data.places))
        .catch(() => setPlaces([]))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [open, query, kind])

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        size="lg"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          setOpen(true)
          if (value && next !== value.label) onClear?.()
        }}
      />
      {open ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${kind === chip.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
              onClick={() => setKind(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      {open && query.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">Tape ta rue.</p>
      ) : null}
      {open && query.trim().length >= 2 && places.length === 0 ? (
        <p className="text-sm text-muted-foreground">Rien sous ce filtre.</p>
      ) : null}
      {open && places.length > 0 ? (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {places.map((place) => (
            <button
              key={`${place.kind ?? ""}-${place.label}-${place.lat}`}
              type="button"
              className="flex flex-col items-start px-3 py-2.5 text-left hover:bg-muted"
              onClick={() => {
                onChange(place)
                setDraft(null)
                setOpen(false)
              }}
            >
              <span className="text-sm font-medium">{place.label}</span>
              <span className="text-xs text-muted-foreground">
                {place.kind ? `${KIND_LABEL[place.kind]} · ` : ""}
                {place.area && place.area !== place.city ? `${place.area} · ` : ""}
                {place.city}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  )
}
