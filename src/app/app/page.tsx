"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { RideMap } from "@/components/ride-map"
import { PlaceField } from "@/components/place-field"
import { useMe } from "@/components/use-me"
import { Button, buttonVariants } from "@/components/ui/button"
import { api } from "@/lib/client"
import type { GeoPoint } from "@/lib/places"

function courseHref(pickup: GeoPoint, dropoff: GeoPoint) {
  const params = new URLSearchParams({
    fromLat: String(pickup.lat),
    fromLng: String(pickup.lng),
    fromLabel: pickup.label,
    fromCity: pickup.city,
    toLat: String(dropoff.lat),
    toLng: String(dropoff.lng),
    toLabel: dropoff.label,
    toCity: dropoff.city,
  })
  return `/app/course?${params.toString()}`
}

export default function AppHomePage() {
  const router = useRouter()
  const { me, loading, error } = useMe()
  const [pickup, setPickup] = useState<GeoPoint | null>(null)
  const [dropoff, setDropoff] = useState<GeoPoint | null>(null)
  const [locating, setLocating] = useState(true)
  const edited = useRef(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      const id = window.setTimeout(() => setLocating(false), 0)
      return () => window.clearTimeout(id)
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        void api<{ place: GeoPoint | null }>(`/api/places?lat=${latitude}&lng=${longitude}`)
          .then((data) => {
            if (!edited.current && data.place) setPickup(data.place)
          })
          .catch(() => undefined)
          .finally(() => setLocating(false))
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
    )
  }, [])

  if (loading) {
    return <div className="absolute inset-0 animate-pulse bg-muted" />
  }

  if (!me) {
    return (
      <div className="flex flex-col gap-4 px-5 py-10">
        <h1 className="font-display text-3xl">Session interrompue</h1>
        <p className="text-muted-foreground">{error ?? "Reconnecte-toi pour continuer."}</p>
        <Link href="/connexion" className={buttonVariants({ size: "xl" })}>
          Connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 z-0">
        <RideMap pickup={pickup} />
      </div>
      <div className="absolute top-4 right-4 left-4 z-30 flex items-start justify-between gap-3">
        <div className="max-w-[70%] rounded-full bg-white px-4 py-2 text-sm font-medium text-[#121417] shadow-md">
          <span className="mr-2 inline-block size-2.5 rounded-full bg-primary align-middle" />
          {locating && !pickup ? "On te situe…" : (pickup?.label ?? "Active la localisation")}
        </div>
        {me.driver ? (
          <Link href="/app/chauffeur" className="shrink-0 rounded-full bg-white px-3 py-2 text-sm font-medium text-[#121417] shadow-md">
            Mode chauffeur
          </Link>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[58vh] flex-col gap-3 overflow-y-auto rounded-t-[1.75rem] bg-background px-5 pt-5 pb-4 shadow-[0_-16px_40px_rgba(0,0,0,0.28)]">
        {me.activeRideId ? (
          <Link
            href={`/app/course/${me.activeRideId}`}
            className="flex items-center justify-between rounded-full bg-primary px-4 py-3 text-primary-foreground"
          >
            <span className="font-medium">Course en cours</span>
            <span>Suivre</span>
          </Link>
        ) : null}
        <h1 className="font-display text-3xl">Où tu vas ?</h1>
        <PlaceField
          label="Départ"
          value={pickup}
          placeholder="Ta position"
          onChange={(place) => {
            edited.current = true
            setPickup(place)
          }}
          onClear={() => {
            edited.current = true
            setPickup(null)
          }}
        />
        <PlaceField label="Arrivée" value={dropoff} placeholder="Où tu vas" onChange={setDropoff} onClear={() => setDropoff(null)} />
        <Button
          size="xl"
          disabled={!pickup || !dropoff}
          onClick={() => {
            if (!pickup || !dropoff) return
            router.push(courseHref(pickup, dropoff))
          }}
        >
          Voir les prix
        </Button>
      </div>
    </div>
  )
}
