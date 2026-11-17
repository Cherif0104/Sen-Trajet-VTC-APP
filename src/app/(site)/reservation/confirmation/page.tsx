import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Demande envoyée", robots: { index: false } };

export default async function ConfirmationPage({ searchParams }: PageProps<"/reservation/confirmation">) {
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" && /^STP-\d{4}-\d{5}$/.test(sp.ref) ? sp.ref : null;
  const user = await getCurrentUser();
  return (
    <section className="flex min-h-[80svh] items-center bg-mist pt-[4.25rem]">
      <div className="container-page max-w-2xl py-16">
        <div className="space-y-6 rounded-3xl border border-border bg-white p-8 text-center shadow-sm md:p-12">
          <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-accent">
            <CheckCircle2 className="size-8 text-gold" />
          </span>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">Demande bien reçue</h1>
          {ref && (
            <div className="mx-auto w-fit rounded-xl bg-ink px-6 py-3">
              <p className="text-xs tracking-[0.2em] text-white/60 uppercase">Votre référence</p>
              <p className="font-mono text-2xl font-semibold tracking-wider text-gold-light">{ref}</p>
            </div>
          )}
          <p className="text-graphite/80">
            Un accusé de réception vous est envoyé par e-mail. Notre équipe vérifie la disponibilité et vous recontacte rapidement. Votre demande
            n&apos;est pas encore une réservation confirmée.
          </p>
          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            {user?.role === "client" ? (
              <ButtonLink href="/espace/demandes" className="h-11 px-6">
                Suivre ma demande
              </ButtonLink>
            ) : (
              <ButtonLink href="/inscription" className="h-11 px-6">
                Créer mon espace client
              </ButtonLink>
            )}
            <ButtonLink href="/" variant="outline" className="h-11 px-6">
              Retour à l&apos;accueil
            </ButtonLink>
          </div>
          {!user && (
            <p className="text-xs text-muted-foreground">
              Avec un espace client, vous suivez vos prochaines demandes, devis et factures en ligne. Pour rattacher cette demande à votre
              espace, communiquez sa référence à notre équipe.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
