import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Fuel, Gauge, UsersRound } from "lucide-react";
import { Reveal } from "./reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";
import { commercialStatusLabel, FUELS, optLabel, TRANSMISSIONS, withDriverLabel } from "@/lib/domain";
import { fcfa } from "@/lib/format";
import type { PublicVehicle } from "@/server/queries/catalog";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 text-xs font-semibold tracking-[0.3em] text-gold uppercase", className)}>
      <span className="h-px w-8 bg-gold" aria-hidden />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  tone = "dark",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
}) {
  return (
    <Reveal className={cn("max-w-2xl space-y-4", align === "center" && "mx-auto text-center [&_p:first-child]:justify-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className={cn("font-display text-4xl leading-[1.05] font-semibold md:text-5xl", tone === "light" ? "text-white" : "text-ink")}>
        {title}
      </h2>
      {intro && <p className={cn("text-base leading-relaxed md:text-lg", tone === "light" ? "text-white/65" : "text-graphite/75")}>{intro}</p>}
    </Reveal>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  image?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink pt-[4.25rem] text-white">
      {image && (
        <Image src={image} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-45" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/30" aria-hidden />
      <div className="container-page py-16 md:py-24">
        <Reveal className="max-w-3xl space-y-5">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="font-display text-4xl leading-[1.04] font-semibold md:text-6xl">{title}</h1>
          {intro && <p className="max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">{intro}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}

export function PriceTag({ v, className }: { v: Pick<PublicVehicle, "priceDay" | "pricesValidated">; className?: string }) {
  if (v.pricesValidated && v.priceDay) {
    return (
      <p className={className}>
        <span className="text-xs text-muted-foreground">À partir de </span>
        <span className="font-semibold text-ink">{fcfa(v.priceDay)}</span>
        <span className="text-xs text-muted-foreground"> / jour</span>
      </p>
    );
  }
  return <p className={cn("text-sm font-semibold text-gold", className)}>Tarif sur devis</p>;
}

export function VehicleCard({ v, priority = false }: { v: PublicVehicle; priority?: boolean }) {
  const specs = [
    v.seats ? { icon: UsersRound, label: `${v.seats} places` } : null,
    optLabel(TRANSMISSIONS, v.transmission) ? { icon: Gauge, label: optLabel(TRANSMISSIONS, v.transmission)! } : null,
    optLabel(FUELS, v.fuel) ? { icon: Fuel, label: optLabel(FUELS, v.fuel)! } : null,
  ].filter(Boolean) as { icon: typeof Fuel; label: string }[];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(8,8,8,0.45)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        {v.coverImage ? (
          <Image
            src={v.coverImage}
            alt={`${v.brand} ${v.model}`}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-2xl text-gold-light/60">
            {v.brand} {v.model}
          </div>
        )}
        {v.categoryName && (
          <span className="absolute top-3 left-3 rounded-full bg-ink/80 px-3 py-1 text-[0.7rem] font-semibold tracking-wider text-gold-light uppercase backdrop-blur">
            {v.categoryName}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold text-ink">
            <Link href={`/vehicules/${v.slug}`} className="after:absolute after:inset-0">
              {v.brand} {v.model}
              {v.version ? <span className="font-normal text-muted-foreground"> {v.version}</span> : null}
            </Link>
          </h3>
          {v.shortDescription && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{v.shortDescription}</p>}
        </div>
        {specs.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-graphite/80">
            {specs.map((s) => (
              <li key={s.label} className="flex items-center gap-1.5">
                <s.icon className="size-3.5 text-gold" />
                {s.label}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <PriceTag v={v} />
            <p className="mt-0.5 text-xs text-muted-foreground">
              {withDriverLabel(v.withDriver)} · {commercialStatusLabel(v.commercialStatus)}
            </p>
          </div>
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-ink text-gold-light transition-colors group-hover:bg-gold group-hover:text-ink">
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function CtaBand({
  title = "Un déplacement à organiser ?",
  text = "Décrivez votre besoin : notre équipe vous répond avec une proposition adaptée.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink py-20 text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_80%_20%,rgba(201,154,50,0.22),transparent)]" aria-hidden />
      <div className="container-page flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
        <Reveal className="max-w-xl space-y-3">
          <h2 className="font-display text-4xl font-semibold md:text-5xl">{title}</h2>
          <p className="text-white/65">{text}</p>
        </Reveal>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/reservation" className="h-12 px-6 text-base font-semibold">
            Demander une réservation
          </ButtonLink>
          <ButtonLink
            href="/reservation?type=devis"
            variant="outline"
            className="h-12 border-white/25 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
          >
            Demander un devis
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
