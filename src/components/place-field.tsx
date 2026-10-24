"use client"

import { useEffect, useState } from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/client"
import type { GeoPoint } from "@/lib/places"

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
  const query = draft ?? value?.label ?? ""

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      void api<{ places: GeoPoint[] }>(`/api/places?q=${encodeURIComponent(query)}`)
        .then((data) => setPlaces(data.places))
        .catch(() => setPlaces([]))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [open, query])

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
      {open && places.length > 0 ? (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {places.map((place) => (
            <button
              key={`${place.label}-${place.lat}`}
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
                {place.area ? `${place.area} · ` : ""}
                {place.city}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  )
}
