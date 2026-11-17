import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { PageHero, VehicleCard } from "@/components/site/blocks";
import { ButtonLink } from "@/components/ui/button-link";
import { FUELS, TRANSMISSIONS } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { listCategories, listPublishedVehicles } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Nos véhicules",
  description: "Catalogue SENTRAJET PREMIUM : berlines, pick-up, minibus et SUV disponibles avec chauffeur au Sénégal.",
  alternates: { canonical: "/vehicules" },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function VehiclesPage({ searchParams }: PageProps<"/vehicules">) {
  const sp = await searchParams;
  const filters = {
    category: one(sp.categorie),
    q: one(sp.q).slice(0, 60),
    seats: Number(one(sp.places)) || undefined,
    transmission: one(sp.boite),
    fuel: one(sp.carburant),
    driver: one(sp.chauffeur),
  };
  const [categories, vehicles] = await Promise.all([listCategories(), listPublishedVehicles(filters)]);
  const hasFilters = Object.values(filters).some(Boolean);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { categorie: filters.category, q: filters.q, places: filters.seats ? String(filters.seats) : "", boite: filters.transmission, carburant: filters.fuel, chauffeur: filters.driver, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/vehicules?${s}` : "/vehicules";
  };
  const selectCls = "h-11 w-full appearance-none rounded-lg border border-input bg-white px-3 text-sm";

  return (
    <>
      <PageHero
        eyebrow="Catalogue"
        title="Nos véhicules"
        intro="Choisissez le véhicule adapté à votre déplacement, ou demandez un devis sans choisir : nous vous conseillons."
        image="/images/ford-fusion.webp"
      />
      <section className="bg-mist py-10 md:py-14">
        <div className="container-page space-y-8">
          <nav aria-label="Catégories" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
            <Link
              href={qs({ categorie: "" })}
              className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", !filters.category ? "border-ink bg-ink text-gold-light" : "border-border bg-white hover:border-ink")}
            >
              Tous
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={qs({ categorie: c.slug })}
                className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-medium", filters.category === c.slug ? "border-ink bg-ink text-gold-light" : "border-border bg-white hover:border-ink")}
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <details className="group rounded-2xl border border-border bg-white md:open:pb-0" open={hasFilters || undefined}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-gold" /> Affiner la recherche
              </span>
              <span className="text-xs font-normal text-muted-foreground">{vehicles.length} véhicule{vehicles.length > 1 ? "s" : ""}</span>
            </summary>
            <form action="/vehicules" className="grid gap-4 border-t border-border p-5 sm:grid-cols-2 lg:grid-cols-6">
              {filters.category && <input type="hidden" name="categorie" value={filters.category} />}
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground lg:col-span-2">
                Recherche
                <input name="q" defaultValue={filters.q} placeholder="Marque, modèle…" className={selectCls} />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Places minimum
                <select name="places" defaultValue={filters.seats ? String(filters.seats) : ""} className={selectCls}>
                  <option value="">Indifférent</option>
                  {[4, 5, 7, 9, 14].map((n) => (
                    <option key={n} value={n}>
                      {n} places et plus
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Boîte de vitesses
                <select name="boite" defaultValue={filters.transmission} className={selectCls}>
                  <option value="">Indifférent</option>
                  {TRANSMISSIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Carburant
                <select name="carburant" defaultValue={filters.fuel} className={selectCls}>
                  <option value="">Indifférent</option>
                  {FUELS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Chauffeur
                <select name="chauffeur" defaultValue={filters.driver} className={selectCls}>
                  <option value="">Indifférent</option>
                  <option value="avec">Avec chauffeur</option>
                  <option value="sans">Sans chauffeur</option>
                </select>
              </label>
              <div className="flex gap-3 sm:col-span-2 lg:col-span-6 lg:justify-end">
                {hasFilters && (
                  <ButtonLink href="/vehicules" variant="ghost" className="h-11">
                    Réinitialiser
                  </ButtonLink>
                )}
                <button type="submit" className="h-11 rounded-lg bg-ink px-6 text-sm font-semibold text-gold-light hover:bg-graphite">
                  Appliquer les filtres
                </button>
              </div>
            </form>
          </details>

          {vehicles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v, i) => (
                <VehicleCard key={v.id} v={v} priority={i < 3} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
              <p className="text-lg font-semibold">Aucun véhicule ne correspond à ces critères.</p>
              <p className="mt-2 text-sm text-muted-foreground">Élargissez votre recherche ou décrivez votre besoin : nous trouverons la bonne solution.</p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href="/vehicules" variant="outline" className="h-11">
                  Voir tous les véhicules
                </ButtonLink>
                <ButtonLink href="/reservation?type=devis" className="h-11">
                  Demander un devis
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
