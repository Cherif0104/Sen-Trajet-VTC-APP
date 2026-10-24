"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { useMe } from "@/components/use-me"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fcfa, firstName } from "@/lib/format"

const corridors = [
  { href: "/app/covoiturage?from=baux&to=thies", label: "Thiès", price: "2 000 F" },
  { href: "/app/covoiturage?from=mermoz&to=mbour", label: "Mbour", price: "2 500 F" },
  { href: "/app/covoiturage?from=baux&to=touba", label: "Touba", price: "5 000 F" },
  { href: "/app/covoiturage?from=baux&to=saint-louis", label: "Saint-Louis", price: "6 000 F" },
]

const hops = [
  { href: "/app/course?to=almadies", label: "Almadies" },
  { href: "/app/course?to=independance", label: "Plateau" },
  { href: "/app/course?to=aibd", label: "AIBD" },
  { href: "/app/course?to=ucad", label: "UCAD" },
  { href: "/app/course?to=pikine", label: "Pikine" },
]

export default function AppHomePage() {
  const { me, loading, error } = useMe()

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    )
  }

  if (!me) {
    return (
      <div className="flex flex-col gap-4 px-4 py-8">
        <h1 className="font-display text-3xl">Session interrompue</h1>
        <p className="text-muted-foreground">{error ?? "Reconnectez-vous pour continuer."}</p>
        <Link href="/connexion" className={buttonVariants({ size: "xl" })}>
          Connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Nanga def</p>
          <h1 className="font-display text-4xl">{firstName(me.name)}</h1>
        </div>
        <Link href="/app/compte" className="rounded-2xl bg-secondary px-3 py-2 text-right text-secondary-foreground">
          <span className="block text-xs">Portefeuille</span>
          <span className="font-medium">{fcfa(me.balance)}</span>
        </Link>
      </div>

      {me.activeRideId ? (
        <Link href={`/app/course/${me.activeRideId}`} className="rounded-3xl bg-primary px-5 py-4 text-primary-foreground">
          <span className="block text-sm text-primary-foreground/80">Course en cours</span>
          <span className="mt-1 flex items-center justify-between font-display text-2xl">
            Suivre
            <ArrowRightIcon />
          </span>
        </Link>
      ) : null}

      <div className="flex flex-col gap-3">
        <Link href="/app/course" className={buttonVariants({ size: "xl" })}>
          Demander une course
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
        <Link href="/app/covoiturage" className={buttonVariants({ variant: "secondary", size: "xl" })}>
          Réserver un siège
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Depuis Sacré-Cœur</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {hops.map((hop) => (
            <Link
              key={hop.href}
              href={hop.href}
              className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm"
            >
              {hop.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Sièges du jour</h2>
        <ul className="flex flex-col gap-2">
          {corridors.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
                <span>Dakar → {item.label}</span>
                <span className="text-sm text-muted-foreground">{item.price}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
