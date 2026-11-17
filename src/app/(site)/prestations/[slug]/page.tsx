import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, UsersRound } from "lucide-react";
import { CtaBand, PageHero, SectionHeading, VehicleCard } from "@/components/site/blocks";
import { ButtonLink } from "@/components/ui/button-link";
import { INTERCITY_DESTINATIONS, SERVICES } from "@/lib/domain";
import { listPublishedVehicles } from "@/server/queries/catalog";

const CATEGORY_FOR: Record<string, string | undefined> = {
  groupes: "minibus",
  mission_terrain: "pick-up",
};

export async function generateMetadata({ params }: PageProps<"/prestations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = SERVICES.find((x) => x.slug === slug);
  if (!s) return {};
  return { title: s.title, description: s.short, alternates: { canonical: `/prestations/${s.slug}` }, openGraph: { images: [{ url: s.image }] } };
}

export default async function ServicePage({ params }: PageProps<"/prestations/[slug]">) {
  const { slug } = await params;
  const s = SERVICES.find((x) => x.slug === slug);
  if (!s) notFound();
  const isOwner = s.value === "partenariat";
  const vehicles = isOwner ? [] : await listPublishedVehicles({ category: CATEGORY_FOR[s.value], limit: 3 });

  return (
    <>
      <PageHero eyebrow="Prestation" title={s.title} intro={s.short} image={s.image}>
        <div className="flex flex-col gap-3 pt-3 sm:flex-row">
          {isOwner ? (
            <ButtonLink href="/devenir-proprietaire" className="h-12 px-6 text-base font-semibold">
              Proposer mon véhicule
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href={`/reservation?service=${s.value}`} className="h-12 px-6 text-base font-semibold">
                Demander une réservation
              </ButtonLink>
              <ButtonLink
                href={`/reservation?service=${s.value}&type=devis`}
                variant="outline"
                className="h-12 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
              >
                Demander un devis
              </ButtonLink>
            </>
          )}
        </div>
      </PageHero>
      <section className="bg-white py-16 md:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <SectionHeading eyebrow="Ce que nous proposons" title="Un service maîtrisé de bout en bout" />
            <ul className="grid gap-4 sm:grid-cols-2">
              {s.points.map((p) => (
                <li key={p} className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                  {p}
                </li>
              ))}
            </ul>
            {s.value === "interurbain" && (
              <div className="space-y-3 pt-4">
                <h3 className="text-lg font-semibold">Destinations fréquentes au départ de Dakar</h3>
                <ul className="flex flex-wrap gap-2">
                  {INTERCITY_DESTINATIONS.map((d) => (
                    <li key={d} className="rounded-full bg-mist px-4 py-2 text-sm font-medium">
                      Dakar → {d}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground">D&apos;autres destinations sont possibles sur demande.</p>
              </div>
            )}
          </div>
          <aside className="h-fit space-y-4 rounded-2xl bg-ink p-7 text-white">
            <UsersRound className="size-7 text-gold" />
            <h3 className="text-lg font-semibold">Pour qui ?</h3>
            <p className="text-white/70">{s.audience}</p>
            <div className="gold-hairline my-2" />
            <p className="text-sm text-white/60">
              {isOwner
                ? "Chaque partenariat fait l'objet d'une étude, d'une inspection et d'un contrat écrit. Aucun revenu n'est promis avant signature."
                : "Les tarifs sont établis sur devis selon la durée, le trajet, le véhicule et les options choisies."}
            </p>
          </aside>
        </div>
      </section>
      {vehicles.length > 0 && (
        <section className="bg-mist py-16 md:py-20">
          <div className="container-page space-y-10">
            <SectionHeading eyebrow="Véhicules adaptés" title="Pour cette prestation" />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v) => (
                <VehicleCard key={v.id} v={v} />
              ))}
            </div>
          </div>
        </section>
      )}
      <CtaBand />
    </>
  );
}
