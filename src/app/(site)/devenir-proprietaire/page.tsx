import type { Metadata } from "next";
import Image from "next/image";
import { FileCheck2, FileText, Handshake, LineChart, Search, Send, Wrench, CarFront } from "lucide-react";
import { PageHero, SectionHeading } from "@/components/site/blocks";
import { Reveal } from "@/components/site/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Devenir partenaire propriétaire",
  description: "Confiez votre véhicule à SENTRAJET PREMIUM : étude, inspection, contrat écrit et suivi transparent depuis votre espace propriétaire.",
  alternates: { canonical: "/devenir-proprietaire" },
};

const STEPS = [
  { icon: Send, title: "Soumission", text: "Vous créez votre compte et décrivez votre véhicule avec photos et documents." },
  { icon: Search, title: "Étude du dossier", text: "Notre équipe examine le véhicule, son historique et vos conditions." },
  { icon: Wrench, title: "Inspection", text: "Un rendez-vous est fixé pour inspecter le véhicule." },
  { icon: FileText, title: "Proposition", text: "Nous vous adressons une proposition de partenariat détaillée." },
  { icon: Handshake, title: "Contrat", text: "Les engagements de chacun sont formalisés dans un contrat écrit." },
  { icon: CarFront, title: "Intégration", text: "Le véhicule rejoint la flotte SENTRAJET PREMIUM." },
  { icon: LineChart, title: "Suivi", text: "Vous suivez contrats, documents et paiements depuis votre espace." },
];

export default async function OwnerLandingPage() {
  const user = await getCurrentUser();
  const isOwner = user?.role === "proprietaire";
  return (
    <>
      <PageHero
        eyebrow="Partenariat propriétaires"
        title="Confiez votre véhicule à une équipe exigeante"
        intro="Vous possédez un véhicule en bon état ? Proposez-le en partenariat. Chaque dossier est étudié avec soin et formalisé par un contrat."
        image="/images/partenariat.webp"
      >
        <div className="flex flex-col gap-3 pt-3 sm:flex-row">
          {isOwner ? (
            <ButtonLink href="/proprietaire/vehicules/nouveau" className="h-12 px-6 text-base font-semibold">
              Proposer un véhicule
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/inscription?profil=proprietaire" className="h-12 px-6 text-base font-semibold">
                Créer mon espace propriétaire
              </ButtonLink>
              <ButtonLink
                href="/connexion?next=/proprietaire"
                variant="outline"
                className="h-12 border-white/30 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
              >
                J&apos;ai déjà un compte
              </ButtonLink>
            </>
          )}
        </div>
      </PageHero>
      <section className="bg-white py-16 md:py-24">
        <div className="container-page space-y-12">
          <SectionHeading align="center" eyebrow="Le parcours" title="Sept étapes, en toute transparence" />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={(i % 4) * 0.06}>
                <li className="h-full rounded-2xl border border-border p-6">
                  <div className="flex items-center justify-between">
                    <s.icon className="size-6 text-gold" />
                    <span className="font-display text-3xl font-semibold text-gold/30">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
      <section className="bg-mist py-16 md:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <SectionHeading eyebrow="Votre dossier" title="Les informations à préparer" />
            <ul className="space-y-3">
              {[
                "Marque, modèle, année et immatriculation",
                "Kilométrage et état général",
                "Photos récentes du véhicule (extérieur et intérieur)",
                "Carte grise",
                "Attestation d'assurance en cours de validité",
                "Visite technique",
                "Vos disponibilités et conditions",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm">
                  <FileCheck2 className="mt-0.5 size-4 shrink-0 text-gold" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="rounded-xl border border-gold/40 bg-white p-4 text-sm text-graphite/80">
              Aucun revenu n&apos;est promis avant la signature d&apos;un contrat. Les conditions financières sont définies au cas par cas dans la
              proposition puis dans le contrat de partenariat.
            </p>
          </div>
          <Reveal className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image src="/images/toyota-hilux.webp" alt="Pick-up blanc sur une piste au Sénégal" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
