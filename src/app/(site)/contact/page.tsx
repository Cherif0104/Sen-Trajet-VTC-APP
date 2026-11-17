import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/site/blocks";
import { ContactForm } from "@/components/site/contact-form";
import { getCurrentUser } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { telLink, waLink } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez SENTRAJET PREMIUM par téléphone, WhatsApp ou via le formulaire en ligne.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [{ company }, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const channels = [
    { icon: Phone, label: "Téléphone", value: company.phone, href: telLink(company.phone) },
    { icon: MessageCircle, label: "WhatsApp", value: "Écrire sur WhatsApp", href: waLink(company.whatsapp, "Bonjour SENTRAJET PREMIUM, je souhaite des informations.") },
    company.email ? { icon: Mail, label: "E-mail", value: company.email, href: `mailto:${company.email}` } : null,
    { icon: MapPin, label: "Adresse", value: [company.address, company.city, "Sénégal"].filter(Boolean).join(", "), href: null },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string | null }[];

  return (
    <>
      <PageHero eyebrow="Contact" title="Parlons de votre déplacement" intro="Une question, un besoin particulier ? Notre équipe vous répond." image="/images/corporate.webp" />
      <section className="bg-white py-12 md:py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            {channels.map((c) => {
              const inner = (
                <>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-gold-light">
                    <c.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-xs text-muted-foreground">{c.label}</span>
                    <span className="font-semibold">{c.value}</span>
                  </span>
                </>
              );
              return c.href ? (
                <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-border p-4 hover:border-gold">
                  {inner}
                </a>
              ) : (
                <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-border p-4">
                  {inner}
                </div>
              );
            })}
            {company.hours && <p className="px-1 text-sm text-muted-foreground">Horaires : {company.hours}</p>}
          </div>
          <div className="rounded-2xl border border-border p-5 md:p-8">
            <h2 className="mb-6 text-xl font-semibold">Envoyer un message</h2>
            <ContactForm defaults={user ? { name: user.fullName, email: user.email, phone: user.phone ?? undefined } : undefined} />
          </div>
        </div>
      </section>
    </>
  );
}
