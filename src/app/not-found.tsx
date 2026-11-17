import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-white">
      <Link href="/" className="font-display text-2xl font-bold tracking-[0.14em] text-gold-light">
        SENTRAJET
      </Link>
      <p className="font-display text-7xl font-semibold text-gold">404</p>
      <h1 className="text-2xl font-semibold">Cette page est introuvable</h1>
      <p className="max-w-md text-white/60">Le lien est peut-être erroné ou la page a été déplacée.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" className="h-11 px-6">
          Retour à l&apos;accueil
        </ButtonLink>
        <ButtonLink href="/vehicules" variant="outline" className="h-11 border-white/25 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white">
          Voir nos véhicules
        </ButtonLink>
      </div>
    </main>
  );
}
