import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, MessageCircle, Phone } from "lucide-react";
import { CtaBand } from "@/components/site/blocks";
import { VehicleGallery } from "@/components/site/vehicle-gallery";
import { ButtonLink } from "@/components/ui/button-link";
import { commercialStatusLabel, FUELS, optLabel, TRANSMISSIONS, withDriverLabel } from "@/lib/domain";
import { fcfa, num, telLink, waLink } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { getPublishedVehicle } from "@/server/queries/catalog";
import { getSettings } from "@/server/settings";

export async function generateMetadata({ params }: PageProps<"/vehicules/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = await getPublishedVehicle(slug);
  if (!v) return { title: "Véhicule introuvable" };
  const title = `${v.brand} ${v.model}${v.version ? ` ${v.version}` : ""}`;
  return {
    title,
    description: v.shortDescription ?? `${title} disponible avec chauffeur chez SENTRAJET PREMIUM au Sénégal.`,
    alternates: { canonical: `/vehicules/${v.slug}` },
    openGraph: { images: v.coverImage ? [{ url: v.coverImage }] : undefined },
  };
}

export default async function VehiclePage({ params }: PageProps<"/vehicules/[slug]">) {
  const { slug } = await params;
  const [v, settings] = await Promise.all([getPublishedVehicle(slug), getSettings()]);
  if (!v) notFound();
  const title = `${v.brand} ${v.model}`;

  const specs = [
    ["Catégorie", v.category?.name],
    ["Année", v.year ? String(v.year) : null],
    ["Version", v.version],
    ["Boîte de vitesses", optLabel(TRANSMISSIONS, v.transmission)],
    ["Carburant", optLabel(FUELS, v.fuel)],
    ["Places", v.seats ? String(v.seats) : null],
    ["Portes", v.doors ? String(v.doors) : null],
    ["Bagages", v.luggage],
    ["Couleur", v.color],
    ["Kilométrage", v.mileage ? `${num(v.mileage)} km` : null],
    ["Chauffeur", withDriverLabel(v.withDriver)],
    ["Disponibilité", commercialStatusLabel(v.commercialStatus)],
  ].filter(([, val]) => val) as [string, string][];

  const prices = v.pricesValidated
    ? ([
        ["Journée", v.priceDay],
        ["Semaine", v.priceWeek],
        ["Mois", v.priceMonth],
      ].filter(([, p]) => p) as [string, number][])
    : [];

  const allFeatures = [...v.features.map((f) => f.name), ...(v.customFeatures ?? [])];
  const images = v.images.length ? v.images : v.coverImage ? [{ url: v.coverImage, alt: title }] : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: title,
    brand: { "@type": "Brand", name: v.brand },
    model: v.model,
    vehicleModelDate: v.year ?? undefined,
    vehicleSeatingCapacity: v.seats ?? undefined,
    image: v.coverImage ? `${SITE_URL}${v.coverImage}` : undefined,
    url: `${SITE_URL}/vehicules/${v.slug}`,
    description: v.shortDescription ?? undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="bg-ink pt-[4.25rem]" />
      <section className="bg-white py-8 md:py-12">
        <div className="container-page space-y-6">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-ink">Accueil</Link>
            <ChevronRight className="size-3" />
            <Link href="/vehicules" className="hover:text-ink">Véhicules</Link>
            <ChevronRight className="size-3" />
            <span className="text-ink">{title}</span>
          </nav>
          <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
            <VehicleGallery images={images} title={title} />
            <div className="space-y-7">
              <div className="space-y-3">
                {v.category && <p className="text-xs font-semibold tracking-[0.25em] text-gold uppercase">{v.category.name}</p>}
                <h1 className="font-display text-5xl leading-none font-semibold">
                  {title}
                  {v.version && <span className="block pt-2 font-sans text-lg font-normal text-muted-foreground">{v.version}</span>}
                </h1>
                {v.shortDescription && <p className="text-graphite/80">{v.shortDescription}</p>}
              </div>
              <div className="rounded-2xl border border-border bg-mist p-5">
                {prices.length > 0 ? (
                  <dl className="grid grid-cols-3 gap-3">
                    {prices.map(([label, p]) => (
                      <div key={label}>
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="text-lg font-semibold">{fcfa(p)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div>
                    <p className="text-lg font-semibold text-ink">Tarif sur devis</p>
                    <p className="text-sm text-muted-foreground">Le tarif dépend de la durée, du trajet et des options. Demandez votre devis personnalisé.</p>
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ButtonLink href={`/reservation?vehicule=${v.slug}`} className="h-12 text-base font-semibold sm:col-span-2">
                  Réserver ce véhicule
                </ButtonLink>
                <ButtonLink href={`/reservation?vehicule=${v.slug}&type=devis`} variant="outline" className="h-12">
                  Demander un devis
                </ButtonLink>
                <a
                  href={waLink(settings.company.whatsapp, `Bonjour SENTRAJET PREMIUM, je suis intéressé(e) par le véhicule ${title}. Est-il disponible ?`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 text-sm font-semibold text-[#128C4B] hover:bg-[#25D366]/20"
                >
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
                <a href={telLink(settings.company.phone)} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-medium text-graphite hover:text-gold sm:col-span-2">
                  <Phone className="size-4" /> {settings.company.phone}
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-10 pt-6 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-8">
              {(v.description || v.usages) && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Présentation</h2>
                  {v.description && <p className="leading-relaxed whitespace-pre-line text-graphite/85">{v.description}</p>}
                  {v.usages && (
                    <p className="text-sm text-graphite/85">
                      <span className="font-semibold">Usages recommandés : </span>
                      {v.usages}
                    </p>
                  )}
                </div>
              )}
              {allFeatures.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Équipements</h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {allFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent text-gold">
                          <Check className="size-3.5" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Caractéristiques</h2>
              <dl className="divide-y divide-border rounded-2xl border border-border">
                {specs.map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right font-medium">{val}</dd>
                  </div>
                ))}
              </dl>
              {specs.length < 6 && <p className="text-xs text-muted-foreground">Les caractéristiques détaillées de ce véhicule vous sont communiquées sur demande.</p>}
            </div>
          </div>
        </div>
      </section>
      <CtaBand title="Ce véhicule vous intéresse ?" text="Envoyez votre demande : nous confirmons la disponibilité et vous adressons une proposition." />
    </>
  );
}
