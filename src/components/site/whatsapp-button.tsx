"use client";

import { usePathname } from "next/navigation";
import { waLink } from "@/lib/format";

function messageFor(pathname: string): string {
  if (pathname.startsWith("/vehicules/")) {
    const name = pathname.split("/")[2]?.replace(/-/g, " ") ?? "";
    return `Bonjour SENTRAJET PREMIUM, je suis intéressé(e) par le véhicule ${name}. Pouvez-vous me renseigner sur sa disponibilité ?`;
  }
  if (pathname.startsWith("/vehicules")) return "Bonjour SENTRAJET PREMIUM, je souhaite des informations sur vos véhicules.";
  if (pathname.startsWith("/prestations/voyages-interurbains"))
    return "Bonjour SENTRAJET PREMIUM, je souhaite organiser un voyage interurbain au départ de Dakar.";
  if (pathname.startsWith("/prestations/location-corporate"))
    return "Bonjour SENTRAJET PREMIUM, je représente une entreprise et souhaite discuter d'une solution de mobilité.";
  if (pathname.startsWith("/prestations/groupes")) return "Bonjour SENTRAJET PREMIUM, je souhaite un minibus pour un groupe.";
  if (pathname.startsWith("/prestations/missions-terrain")) return "Bonjour SENTRAJET PREMIUM, je prépare une mission terrain et cherche un véhicule avec chauffeur.";
  if (pathname.startsWith("/prestations")) return "Bonjour SENTRAJET PREMIUM, je souhaite des informations sur vos prestations.";
  if (pathname.startsWith("/devenir-proprietaire") || pathname.startsWith("/proprietaire"))
    return "Bonjour SENTRAJET PREMIUM, je souhaite confier mon véhicule en partenariat.";
  if (pathname.startsWith("/reservation")) return "Bonjour SENTRAJET PREMIUM, j'ai besoin d'aide pour ma demande de réservation.";
  return "Bonjour SENTRAJET PREMIUM, je souhaite des informations sur vos services.";
}

export function WhatsAppButton({ number }: { number: string }) {
  const pathname = usePathname();
  return (
    <a
      href={waLink(number, messageFor(pathname))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      className="fixed right-4 bottom-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-[#25D366]/40 md:right-6 md:bottom-6"
    >
      <svg viewBox="0 0 32 32" className="size-7" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C8.86 3 3.04 8.82 3.04 16c0 2.3.6 4.53 1.74 6.5L3 29l6.68-1.75A12.94 12.94 0 0 0 16.04 29C23.22 29 29 23.18 29 16S23.22 3 16.04 3Zm0 23.62c-2.02 0-4-.54-5.72-1.57l-.41-.24-3.97 1.04 1.06-3.86-.27-.4A10.6 10.6 0 0 1 5.42 16c0-5.86 4.77-10.62 10.62-10.62S26.62 10.14 26.62 16 21.9 26.62 16.04 26.62Zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.14 3.09 1.3 3.3.16.21 2.25 3.43 5.45 4.81.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.89-.77 2.15-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
