import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CtaBand, PageHero } from "@/components/site/blocks";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description: "Réservation, devis, voyages en régions, comptes entreprise et partenariat propriétaires : les réponses à vos questions.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const { faq } = await getSettings();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="FAQ" title="Questions fréquentes" intro="Tout ce qu'il faut savoir avant de réserver ou de nous confier votre véhicule." />
      <section className="bg-white py-14 md:py-20">
        <div className="container-page max-w-3xl">
          {faq.length > 0 ? (
            <Accordion className="divide-y divide-border rounded-2xl border border-border">
              {faq.map((f, i) => (
                <AccordionItem key={i} value={`q${i}`} className="px-5">
                  <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground">Les questions fréquentes seront bientôt publiées.</p>
          )}
        </div>
      </section>
      <CtaBand title="Vous ne trouvez pas votre réponse ?" text="Écrivez-nous ou appelez-nous : notre équipe vous répond." />
    </>
  );
}
