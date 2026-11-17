import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CtaBand, PageHero } from "@/components/site/blocks";
import { Reveal } from "@/components/site/reveal";
import { SERVICES } from "@/lib/domain";

export const metadata: Metadata = {
  title: "Prestations",
  description:
    "Location avec chauffeur, location corporate, transport de groupes, voyages interurbains, missions terrain et partenariat propriétaires : découvrez les prestations SENTRAJET PREMIUM.",
  alternates: { canonical: "/prestations" },
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Prestations"
        title="Des solutions de mobilité complètes"
        intro="Six offres pour répondre aux besoins des particuliers, des entreprises, des organisations et des propriétaires de véhicules."
        image="/images/chauffeur.webp"
      />
      <section className="bg-white py-16 md:py-24">
        <div className="container-page space-y-16 md:space-y-24">
          {SERVICES.map((s, i) => (
            <Reveal key={s.slug}>
              <article className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-ink">
                  <Image src={s.image} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
                </div>
                <div className="space-y-5">
                  <p className="text-xs font-semibold tracking-[0.3em] text-gold">0{i + 1}</p>
                  <h2 className="font-display text-4xl font-semibold md:text-5xl">{s.title}</h2>
                  <p className="text-lg text-graphite/80">{s.short}</p>
                  <ul className="space-y-2.5">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/prestations/${s.slug}`} className="inline-flex items-center gap-2 pt-2 text-sm font-semibold hover:text-gold">
                    Découvrir cette prestation <ArrowRight className="size-4" />
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
