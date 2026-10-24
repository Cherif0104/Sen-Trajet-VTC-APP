"use client"

import Link from "next/link"
import { Building2Icon, MapPinIcon, PlaneIcon } from "lucide-react"
import { RideMap } from "@/components/ride-map"
import { useMe } from "@/components/use-me"
import { buttonVariants } from "@/components/ui/button"
import { placeById, toPoint } from "@/lib/places"

const hops = [
  { href: "/app/course?to=almadies", label: "Almadies", icon: MapPinIcon },
  { href: "/app/course?to=aibd", label: "Aéroport AIBD", icon: PlaneIcon },
  { href: "/app/course?to=independance", label: "Plateau", icon: Building2Icon },
]

export default function AppHomePage() {
  const { me, loading, error } = useMe()
  const here = placeById("sacre-coeur")

  if (loading) {
    return <div className="absolute inset-0 animate-pulse bg-muted" />
  }

  if (!me) {
    return (
      <div className="flex flex-col gap-4 px-5 py-10">
        <h1 className="font-display text-3xl">Session interrompue</h1>
        <p className="text-muted-foreground">{error ?? "Reconnectez-vous pour continuer."}</p>
        <Link href="/connexion" className={buttonVariants({ size: "xl" })}>
          Connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 z-0">
        <RideMap pickup={here ? toPoint(here) : null} />
      </div>
      <div className="absolute top-4 right-4 left-4 z-30 flex items-start justify-between gap-3">
        <div className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-md">
          <span className="mr-2 inline-block size-2.5 rounded-full bg-primary align-middle" />
          Ma position · Sacré-Cœur
        </div>
        {me.driver ? (
          <Link
            href="/app/chauffeur"
            className="shrink-0 rounded-full bg-white px-3 py-2 text-sm font-medium shadow-md"
          >
            Mode chauffeur
          </Link>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-[1.75rem] bg-white px-5 pt-6 pb-4 shadow-[0_-12px_40px_rgba(18,20,23,0.08)]">
        {me.activeRideId ? (
          <Link
            href={`/app/course/${me.activeRideId}`}
            className="mb-4 flex items-center justify-between rounded-full bg-primary px-4 py-3 text-primary-foreground"
          >
            <span className="font-medium">Course en cours</span>
            <span>Suivre</span>
          </Link>
        ) : null}
        <Link href="/app/course" className="font-display text-3xl">
          Où allez-vous ?
        </Link>
        <ul className="mt-2">
          {hops.map((hop) => {
            const Icon = hop.icon
            return (
              <li key={hop.href} className="border-b border-border last:border-b-0">
                <Link href={hop.href} className="flex items-center gap-3 py-3.5">
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-base">{hop.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
