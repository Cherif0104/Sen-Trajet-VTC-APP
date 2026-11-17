import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck2, ClipboardList, Handshake, MapPinned, PhoneCall, Quote, Route, ShieldCheck } from "lucide-react";
import { CtaBand, Eyebrow, SectionHeading, VehicleCard } from "@/components/site/blocks";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { Reveal } from "@/components/site/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { INTERCITY_DESTINATIONS, SERVICES } from "@/lib/domain";
import { SITE_URL } from "@/lib/site";
import { listPublishedPartners, listPublishedTestimonials, listPublishedVehicles } from "@/server/queries/catalog";
import { getSettings } from "@/server/settings";

export default async function HomePage() {
  const [settings, vehicles, testimonials, partners] = await Promise.all([
    getSettings(),
    listPublishedVehicles({ limit: 6 }),
    listPublishedTestimonials(3),
    listPublishedPartners(),
  ]);
  const stats = settings.stats.filter((s) => s.label && s.value);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "SENTRAJET PREMIUM",
    alternateName: "IMPULCIA AFRIQUE",
    description: "Location de véhicules avec chauffeur, solutions corporate, transport de groupes et voyages interurbains au Sénégal.",
    url: SITE_URL,
    telephone: settings.company.phone,
    image: `${SITE_URL}/images/hero-sentrajet.webp`,
    address: { "@type": "PostalAddress", addressLocality: settings.company.city || "Dakar", addressCountry: "SN", streetAddress: settings.company.address || undefined },
    areaServed: "Sénégal",
    currenciesAccepted: "XOF",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ink text-white">
        <HeroCarousel
          images={[
            { src: "/images/hero-sentrajet.webp", alt: "Berline noire et chauffeur devant un immeuble de Dakar au crépuscule" },
            { src: "/images/corporate.webp", alt: "Cadre descendant d'une berline avec chauffeur" },
            { src: "/images/interurbain.webp", alt: "Route à travers la savane sénégalaise au lever du soleil" },
          ]}
        />
        <div className="absolute inset-0 -z-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" aria-hidden />
        <div className="absolute inset-0 -z-0 bg-gradient-to-r from-ink/85 via-ink/30 to-transparent" aria-hidden />
        <div className="relative container-page pt-32 pb-20 md:pb-28">
          <Reveal className="max-w-3xl space-y-7">
            <Eyebrow>Executive Chauffeur &amp; Mobility Services</Eyebrow>
            <h1 className="font-display text-5xl leading-[0.98] font-semibold text-balance sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              {settings.hero.title.includes("notre engagement") ? (
                <>
                  Votre mobilité, <span className="text-gold-gradient">notre engagement.</span>
                </>
              ) : (
                settings.hero.title
              )}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/75 md:text-lg">{settings.hero.subtitle}</p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/vehicules" className="h-12 px-6 text-base font-semibold">
                Découvrir nos véhicules
              </ButtonLink>
              <ButtonLink
                href="/reservation"
                variant="outline"
                className="h-12 border-white/30 bg-white/5 px-6 text-base text-white backdrop-blur hover:bg-white/15 hover:text-white"
              >
                Demander une réservation
              </ButtonLink>
              <ButtonLink href="/devenir-proprietaire" variant="link" className="h-12 px-2 text-base text-gold-light">
                Devenir partenaire propriétaire <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="border-b border-border bg-white">
          <div className="container-page grid grid-cols-2 gap-px py-10 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="px-4 py-3 text-center">
                <p className="font-display text-4xl font-semibold text-ink md:text-5xl">{s.value}</p>
                <p className="mt-1 text-xs tracking-wider text-muted-foreground uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white py-20 md:py-28">
        <div className="container-page space-y-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Nos prestations"
              title="Une mobilité pensée pour chaque situation"
              intro="Du transfert aéroport aux missions de plusieurs jours en régions, nous mettons à votre disposition le véhicule et le chauffeur adaptés."
            />
            <Link href="/prestations" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-gold">
              Toutes les prestations <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 0.08}>
                <Link
                  href={`/prestations/${s.slug}`}
                  className="group relative flex h-80 flex-col justify-end overflow-hidden rounded-2xl bg-ink p-6 text-white"
                >
                  <Image src={s.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover opacity-70 transition-all duration-700 group-hover:scale-105 group-hover:opacity-55" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" aria-hidden />
                  <div className="relative space-y-2">
                    <span className="text-xs font-semibold tracking-[0.25em] text-gold-light">0{i + 1}</span>
                    <h3 className="font-display text-3xl font-semibold">{s.title}</h3>
                    <p className="text-sm text-white/70">{s.short}</p>
                    <span className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-gold-light">
                      En savoir plus <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-mist py-20 md:py-28">
        <div className="container-page space-y-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow="Notre flotte" title="Des véhicules entretenus, prêts pour la route" intro="Berlines, pick-up et minibus : choisissez le véhicule adapté ou laissez-nous vous conseiller." />
            <Link href="/vehicules" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-gold">
              Voir le catalogue <ArrowRight className="size-4" />
            </Link>
          </div>
          {vehicles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v, i) => (
                <Reveal key={v.id} delay={(i % 3) * 0.08}>
                  <VehicleCard v={v} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
              Notre catalogue est en cours de mise à jour. Contactez-nous pour connaître les véhicules disponibles.
            </p>
          )}
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="container-page space-y-12">
          <SectionHeading align="center" eyebrow="Comment ça marche" title="De la demande à la mission, en toute clarté" />
          <ol className="grid gap-5 md:grid-cols-4">
            {[
              { icon: ClipboardList, title: "Votre demande", text: "Vous décrivez votre besoin en ligne. Une référence unique vous est attribuée immédiatement." },
              { icon: PhoneCall, title: "Vérification", text: "Notre équipe vérifie la disponibilité et vous recontacte, avec un devis si nécessaire." },
              { icon: CalendarCheck2, title: "Confirmation", text: "Après votre accord, la réservation est confirmée et le chauffeur est planifié." },
              { icon: Route, title: "Votre trajet", text: "Votre chauffeur est à l'heure. Vous suivez vos demandes et documents depuis votre espace." },
            ].map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <li className="relative h-full rounded-2xl border border-border p-6">
                  <span className="absolute top-6 right-6 font-display text-4xl font-semibold text-gold/25">0{i + 1}</span>
                  <step.icon className="size-7 text-gold" />
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-ink py-20 text-white md:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image src="/images/corporate.webp" alt="Accueil d'un cadre par un chauffeur SENTRAJET" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </Reveal>
          <div className="space-y-8">
            <SectionHeading
              tone="light"
              eyebrow="Entreprises & institutions"
              title="Un partenaire mobilité pour vos équipes"
              intro="Accueil de délégations, déplacements de direction, missions terrain ou contrats de mise à disposition : un interlocuteur dédié et une facturation claire."
            />
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: ShieldCheck, text: "Chauffeurs professionnels et discrets" },
                { icon: BadgeCheck, text: "Véhicules contrôlés avant chaque mission" },
                { icon: ClipboardList, text: "Devis, factures et suivi en ligne" },
                { icon: MapPinned, text: "Dakar et toutes les régions du Sénégal" },
              ].map((f) => (
                <li key={f.text} className="flex items-start gap-3 text-sm text-white/80">
                  <f.icon className="mt-0.5 size-5 shrink-0 text-gold" />
                  {f.text}
                </li>
              ))}
            </ul>
            <ButtonLink href="/prestations/location-corporate" className="h-12 px-6 text-base font-semibold">
              Découvrir l&apos;offre corporate
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Voyages interurbains"
              title="Au départ de Dakar, vers tout le Sénégal"
              intro="Aller simple, aller-retour ou circuit : voyagez confortablement avec un chauffeur habitué aux longues distances."
            />
            <ul className="flex flex-wrap gap-2">
              {INTERCITY_DESTINATIONS.map((d) => (
                <li key={d} className="rounded-full border border-border bg-mist px-4 py-2 text-sm font-medium">
                  Dakar → {d}
                </li>
              ))}
            </ul>
            <ButtonLink href="/reservation?service=interurbain" variant="outline" className="h-11 px-5">
              Préparer un voyage
            </ButtonLink>
          </div>
          <Reveal className="relative aspect-[16/10] overflow-hidden rounded-2xl">
            <Image src="/images/interurbain.webp" alt="Route nationale à travers la savane" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
          </Reveal>
        </div>
      </section>

      <section className="bg-mist py-20 md:py-28">
        <div className="container-page">
          <div className="grid overflow-hidden rounded-3xl bg-ink text-white lg:grid-cols-2">
            <div className="relative min-h-72">
              <Image src="/images/partenariat.webp" alt="Poignée de main entre un propriétaire et un gestionnaire de flotte" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="space-y-6 p-8 md:p-12">
              <Handshake className="size-9 text-gold" />
              <h2 className="font-display text-4xl font-semibold md:text-5xl">Vous possédez un véhicule ?</h2>
              <p className="text-white/70">
                Confiez-le à SENTRAJET PREMIUM. Après étude et inspection, nous vous adressons une proposition de partenariat. Vous suivez ensuite
                l&apos;exploitation, les contrats et les paiements depuis votre espace propriétaire.
              </p>
              <p className="text-xs text-white/45">Aucun revenu n&apos;est garanti avant la signature d&apos;un contrat écrit.</p>
              <ButtonLink href="/devenir-proprietaire" className="h-12 px-6 text-base font-semibold">
                Devenir partenaire propriétaire
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="bg-white py-20 md:py-28">
          <div className="container-page space-y-12">
            <SectionHeading align="center" eyebrow="Témoignages" title="Ils ont voyagé avec nous" />
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="flex flex-col gap-5 rounded-2xl border border-border p-7">
                  <Quote className="size-7 text-gold" />
                  <blockquote className="flex-1 text-graphite/85">{t.content}</blockquote>
                  <figcaption className="text-sm">
                    <span className="font-semibold">{t.authorName}</span>
                    {(t.authorRole || t.company) && <span className="text-muted-foreground"> — {[t.authorRole, t.company].filter(Boolean).join(", ")}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {partners.length > 0 && (
        <section className="border-t border-border bg-white py-16">
          <div className="container-page space-y-8">
            <p className="text-center text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase">Ils nous font confiance</p>
            <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {partners.map((p) => (
                <li key={p.id} className="text-lg font-semibold text-graphite/60">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logoUrl} alt={p.name} className="h-10 w-auto object-contain grayscale" />
                  ) : (
                    p.name
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
