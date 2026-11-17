import type { Metadata } from "next";
import Image from "next/image";
import { Compass, Gem, Target } from "lucide-react";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/blocks";
import { Reveal } from "@/components/site/reveal";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "À propos",
  description: "SENTRAJET PREMIUM, la marque de mobilité exécutive d'IMPULCIA AFRIQUE au Sénégal : notre mission, notre vision et nos valeurs.",
  alternates: { canonical: "/a-propos" },
};

export default async function AboutPage() {
  const { about, stats } = await getSettings();
  const shownStats = stats.filter((s) => s.label && s.value);
  return (
    <>
      <PageHero eyebrow="À propos" title="Une marque d'IMPULCIA AFRIQUE" intro={about.intro} image="/images/hero-sentrajet.webp" />
      <section className="bg-white py-16 md:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image src="/images/chauffeur.webp" alt="Intérieur d'un véhicule avec chauffeur à Dakar" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </Reveal>
          <div className="space-y-8">
            <SectionHeading eyebrow="Notre engagement" title="Le sens du service, à chaque kilomètre" />
            <div className="grid gap-5">
              {[
                { icon: Target, title: "Notre mission", text: about.mission },
                { icon: Compass, title: "Notre vision", text: about.vision },
              ].map((b) => (
                <div key={b.title} className="flex gap-4 rounded-2xl border border-border p-5">
                  <b.icon className="size-6 shrink-0 text-gold" />
                  <div>
                    <h3 className="font-semibold">{b.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {about.values.length > 0 && (
        <section className="bg-ink py-16 text-white md:py-24">
          <div className="container-page space-y-10">
            <SectionHeading tone="light" align="center" eyebrow="Nos valeurs" title="Ce qui guide notre travail" />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {about.values.map((v) => (
                <li key={v} className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 p-6 text-center">
                  <Gem className="size-6 text-gold" />
                  <span className="font-semibold">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      {shownStats.length > 0 && (
        <section className="bg-mist py-14">
          <div className="container-page grid grid-cols-2 gap-6 md:grid-cols-4">
            {shownStats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-5xl font-semibold">{s.value}</p>
                <p className="mt-1 text-xs tracking-wider text-muted-foreground uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      <CtaBand />
    </>
  );
}
