import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/site/blocks";
import { listPublishedPartners } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Partenaires",
  description: "Entreprises et organisations qui font confiance à SENTRAJET PREMIUM.",
  alternates: { canonical: "/partenaires" },
};

export default async function PartnersPage() {
  const partners = await listPublishedPartners();
  return (
    <>
      <PageHero eyebrow="Partenaires" title="Ils nous font confiance" intro="Entreprises, institutions et organisations qui ont choisi SENTRAJET PREMIUM pour leur mobilité." />
      <section className="bg-white py-14 md:py-20">
        <div className="container-page">
          {partners.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {partners.map((p) => (
                <li key={p.id} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border p-8 text-center">
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logoUrl} alt={p.name} className="h-14 w-auto object-contain" />
                  ) : (
                    <span className="font-display text-2xl font-semibold">{p.name}</span>
                  )}
                  {p.sector && <span className="text-xs text-muted-foreground">{p.sector}</span>}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gold hover:underline">
                      Site web
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="font-semibold">Nos références seront bientôt présentées ici.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Nous ne publions le nom ou le logo d&apos;un partenaire qu&apos;avec son autorisation explicite.
              </p>
            </div>
          )}
        </div>
      </section>
      <CtaBand title="Votre organisation a des besoins réguliers ?" text="Parlons d'un contrat de mobilité adapté à vos équipes." />
    </>
  );
}
