import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SERVICES } from "@/lib/domain";
import { telLink } from "@/lib/format";
import type { SiteSettings } from "@/lib/site-content";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const { company, social } = settings;
  const socials = [
    { href: social.facebook, label: "Facebook" },
    { href: social.instagram, label: "Instagram" },
    { href: social.linkedin, label: "LinkedIn" },
  ].filter((s) => s.href);

  return (
    <footer className="bg-ink text-white/70">
      <div className="gold-hairline" />
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-5">
          <Logo logoUrl={settings.branding.logoUrl} />
          <p className="max-w-xs text-sm leading-relaxed">
            Executive Chauffeur &amp; Mobility Services. Une marque de {company.legalName || "IMPULCIA AFRIQUE"}, au service de vos
            déplacements au Sénégal.
          </p>
          {socials.length > 0 && (
            <div className="flex gap-4 text-sm">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-gold-light">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.25em] text-gold-light uppercase">Prestations</h2>
          <ul className="space-y-2.5 text-sm">
            {SERVICES.map((s) => (
              <li key={s.slug}>
                <Link href={`/prestations/${s.slug}`} className="hover:text-white">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.25em] text-gold-light uppercase">SENTRAJET</h2>
          <ul className="space-y-2.5 text-sm">
            {[
              ["/vehicules", "Nos véhicules"],
              ["/a-propos", "À propos"],
              ["/partenaires", "Partenaires"],
              ["/faq", "Questions fréquentes"],
              ["/reservation", "Demande de réservation"],
              ["/connexion", "Espace client"],
              ["/devenir-proprietaire", "Espace propriétaire"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-xs font-semibold tracking-[0.25em] text-gold-light uppercase">Contact</h2>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={telLink(company.phone)} className="flex items-center gap-3 hover:text-white">
                <Phone className="size-4 text-gold" /> {company.phone}
              </a>
            </li>
            {company.email && (
              <li>
                <a href={`mailto:${company.email}`} className="flex items-center gap-3 hover:text-white">
                  <Mail className="size-4 text-gold" /> {company.email}
                </a>
              </li>
            )}
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 text-gold" />
              <span>{[company.address, company.city, "Sénégal"].filter(Boolean).join(", ")}</span>
            </li>
            {company.hours && <li className="text-white/50">{company.hours}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {company.legalName || "IMPULCIA AFRIQUE"} — SENTRAJET PREMIUM. Tous droits réservés.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Informations légales">
            <Link href="/mentions-legales" className="hover:text-white">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-white">
              Confidentialité
            </Link>
            <Link href="/cgv" className="hover:text-white">
              Conditions générales
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
