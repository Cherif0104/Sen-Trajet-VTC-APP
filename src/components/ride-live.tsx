"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PhoneIcon, Share2Icon, SirenIcon } from "lucide-react"
import { toast } from "sonner"
import { FocusBar } from "@/components/focus-bar"
import { RideMap } from "@/components/ride-map"
import { Button, buttonVariants } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { api } from "@/lib/client"
import { PAY_METHODS } from "@/lib/domain"
import type { RideDTO } from "@/lib/dto"
import { fcfa, formatKm, formatMinutes, rideStatusLabel } from "@/lib/format"
import { cn } from "cn"

export function RideLive({ id }: { id: string }) {
  const [ride, setRide] = useState<RideDTO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")

  useEffect(() => {
    let stop = false
    async function pull() {
      try {
        const next = await api<RideDTO>(`/api/rides/${id}`)
        if (!stop) {
          setRide(next)
          setError(null)
        }
      } catch (caught) {
        if (!stop) setError(caught instanceof Error ? caught.message : "Course introuvable.")
      }
    }
    void pull()
    const poll = window.setInterval(() => void pull(), 2000)
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      stop = true
      window.clearInterval(poll)
      window.clearInterval(clock)
    }
  }, [id])

  async function act(action: string, extra?: { rating?: number; comment?: string }) {
    setBusy(true)
    try {
      const next = await api<RideDTO>(`/api/rides/${id}`, {
        method: "POST",
        body: JSON.stringify({ action, ...extra }),
      })
      setRide(next)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Action impossible.")
    } finally {
      setBusy(false)
    }
  }

  async function share(current: RideDTO) {
    const text = `Course Sen Trajet : ${current.pickup.label} → ${current.dropoff.label}${
      current.driver ? `. ${current.driver.name}, ${current.driver.plate}` : ""
    }.`
    if (navigator.share) {
      await navigator.share({ title: "Ma course Sen Trajet", text }).catch(() => undefined)
      return
    }
    await navigator.clipboard.writeText(text)
    toast.success("Le suivi est copié.")
  }

  if (error && !ride) {
    return (
      <div className="flex flex-col gap-4 px-4 py-8">
        <FocusBar title="Course" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="h-[46vh] animate-pulse bg-muted" />
        <div className="px-4 py-4">
          <FocusBar title="Course" />
        </div>
      </div>
    )
  }

  const active = ["matching", "accepted", "arrived", "in_progress"].includes(ride.status)
  const method = PAY_METHODS.find((item) => item.id === ride.paymentMethod)?.label ?? ride.paymentMethod
  const waitLeft =
    ride.status === "arrived" && ride.driver?.launchFleet && ride.arrivedAt
      ? Math.max(0, 50 - Math.floor((now - new Date(ride.arrivedAt).getTime()) / 1000))
      : null
  const scored = ride.viewer === "rider" ? ride.driverScore : ride.riderScore
  const mins = ride.etaS != null ? formatMinutes(ride.etaS) : null
  const driverFirst = ride.driver?.name.split(" ")[0]
  const riderFirst = ride.rider.name.split(" ")[0]
  const headline =
    ride.viewer === "driver"
      ? ride.status === "accepted"
        ? `Vers ${riderFirst}`
        : ride.status === "arrived"
          ? "Vous êtes au point."
          : ride.status === "in_progress"
            ? `Vers ${ride.dropoff.label}`
            : ride.status === "cancelled"
              ? "Course annulée."
              : ride.status === "completed"
                ? "Course terminée."
                : "Recherche d’un passager."
      : ride.status === "matching"
        ? "On cherche un chauffeur."
        : ride.status === "accepted"
          ? `${driverFirst ?? "Votre chauffeur"} arrive${mins ? ` dans ${mins}` : ""}`
          : ride.status === "arrived"
            ? `${driverFirst ?? "Votre chauffeur"} est au point.`
            : ride.status === "in_progress"
              ? `Vers ${ride.dropoff.label}`
              : ride.status === "cancelled"
                ? "Course annulée."
                : "Course terminée."
  const terminal = ride.status === "completed" || ride.status === "cancelled"

  return (
    <div className={cn("relative min-h-dvh", terminal && "bg-background")}>
      {terminal ? null : (
        <div className="absolute inset-0 z-0">
          <RideMap pickup={ride.pickup} dropoff={ride.dropoff} driver={ride.driverPoint} route={ride.route} />
        </div>
      )}
      <div
        className={cn(
          "z-20 flex flex-col gap-4 bg-background px-4",
          terminal
            ? "mx-auto min-h-dvh w-full max-w-lg py-6"
            : "absolute inset-x-0 bottom-0 max-h-[74vh] overflow-y-auto rounded-t-[1.75rem] pt-3 pb-6 shadow-[0_-16px_40px_rgba(0,0,0,0.28)]",
        )}
      >
        {terminal ? null : <div className="mx-auto h-1 w-10 rounded-full bg-border" />}
        <FocusBar title={rideStatusLabel(ride.status)} back={ride.viewer === "driver" ? "/app/chauffeur" : "/app"} />
        <div className="flex flex-col gap-2">
          <p className="font-display text-3xl text-balance">{headline}</p>
          <p className="text-sm text-muted-foreground">
            {ride.status === "in_progress" && mins
              ? `${mins} · prix fixé`
              : `${ride.pickup.label} → ${ride.dropoff.label}`}
          </p>
          {active ? <p className="font-display text-4xl tabular-nums">{fcfa(ride.fare)}</p> : null}
          {active ? <Progress value={Math.round(ride.progress * 100)} /> : null}
        </div>

        {ride.driver ? (
          <div className="flex flex-col gap-2 rounded-3xl bg-card px-4 py-4">
            <p className="font-medium">{ride.driver.name}</p>
            <p className="text-sm text-muted-foreground">
              {ride.driver.color} {ride.driver.make} {ride.driver.model} · {ride.driver.plate} · {ride.driver.rating.toFixed(1).replace(".", ",")}
            </p>
            {ride.driver.serene || ride.serene ? <p className="text-sm text-accent">Trajet Serein</p> : null}
            {ride.driver.phone ? (
              <a
                href={`tel:${ride.driver.phone}`}
                className={buttonVariants({
                  variant: ride.viewer === "rider" && ride.status === "accepted" ? "default" : "outline",
                  size: ride.viewer === "rider" && ride.status === "accepted" ? "xl" : "lg",
                })}
              >
                <PhoneIcon data-icon="inline-start" />
                Appeler
              </a>
            ) : null}
          </div>
        ) : ride.status === "matching" ? (
          <p className="text-sm text-muted-foreground">On cherche. Personne n’est inventé.</p>
        ) : null}

        {ride.viewer === "driver" && ride.rider.phone ? (
          <a href={`tel:${ride.rider.phone}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            <PhoneIcon data-icon="inline-start" />
            Appeler {ride.rider.name}
          </a>
        ) : null}

        {waitLeft != null ? (
          <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            Confirmez sous {waitLeft} s. Passé ce délai, la course du réseau est annulée et 500 F de frais sont retenus.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          {ride.viewer === "rider" && ride.status === "arrived" ? (
            <Button size="xl" disabled={busy} onClick={() => void act("start")}>
              Je monte
            </Button>
          ) : null}
          {ride.status === "in_progress" ? (
            <Button size="xl" disabled={busy} onClick={() => void act("complete")}>
              {ride.viewer === "rider" ? "Je suis arrivé" : "Terminer la course"}
            </Button>
          ) : null}
          {ride.viewer === "rider" && ["matching", "accepted", "arrived"].includes(ride.status) ? (
            <Button variant="outline" size="lg" disabled={busy} onClick={() => void act("cancel")}>
              {ride.status === "arrived" ? "Annuler · 500 F" : "Annuler sans frais"}
            </Button>
          ) : null}
        </div>

        {ride.status === "completed" && scored == null ? (
          <form
            className="flex flex-col gap-3 rounded-3xl border border-border px-4 py-4"
            onSubmit={(event) => {
              event.preventDefault()
              void act("rate", { rating, comment })
            }}
          >
            <p className="font-medium">{ride.viewer === "rider" ? "Noter le chauffeur" : "Noter le passager"}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className={cn(
                    "size-11 rounded-full border text-sm",
                    rating >= score ? "border-foreground bg-foreground text-background" : "border-border",
                  )}
                  onClick={() => setRating(score)}
                >
                  {score}
                </button>
              ))}
            </div>
            {ride.viewer === "rider" ? (
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={240}
                placeholder="Un mot sur la course"
                className="min-h-20 rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            ) : null}
            <Button type="submit" size="lg" disabled={busy || rating < 1}>
              Envoyer la note
            </Button>
          </form>
        ) : null}

        {scored != null ? <p className="text-sm text-muted-foreground">Note envoyée · {scored}/5</p> : null}

        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={() => void share(ride)}>
            <Share2Icon data-icon="inline-start" />
            Partager
          </Button>
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="lg" />}>
              <SirenIcon data-icon="inline-start" />
              SOS
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Urgence</SheetTitle>
                <SheetDescription>Numéros officiels. Sen Trajet ne remplace pas les secours.</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-2 px-4 pb-6">
                {[
                  ["17", "Police"],
                  ["18", "Pompiers"],
                  ["1515", "SAMU"],
                ].map(([number, label]) => (
                  <a key={number} href={`tel:${number}`} className={buttonVariants({ variant: "secondary", size: "xl" })}>
                    {label} · {number}
                  </a>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <section className="flex flex-col gap-1 rounded-2xl bg-muted px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span>Prix</span>
            <span>{fcfa(ride.fare)}</span>
          </div>
          {ride.net != null ? (
            <div className="flex justify-between">
              <span>Votre net</span>
              <span>{fcfa(ride.net)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-muted-foreground">
            <span>{method}</span>
            <span>{ride.paymentRef}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{formatKm(ride.distanceM)}</span>
            <span>{formatMinutes(ride.durationS)}</span>
          </div>
          {ride.surgeLabel ? <p className="text-muted-foreground">{ride.surgeLabel}</p> : null}
        </section>

        {ride.viewer === "driver" ? (
          <Link href="/app/chauffeur" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            Retour au poste chauffeur
          </Link>
        ) : null}
      </div>
    </div>
  )
}
