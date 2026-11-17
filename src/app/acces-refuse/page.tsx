import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { getCurrentUser } from "@/server/auth";
import { homeFor } from "@/lib/permissions";

export const metadata: Metadata = { title: "Accès refusé", robots: { index: false } };

export default async function AccessDeniedPage() {
  const user = await getCurrentUser();
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-5 bg-mist px-6 text-center">
      <ShieldAlert className="size-12 text-gold" />
      <h1 className="font-display text-4xl font-semibold">Accès refusé</h1>
      <p className="max-w-md text-muted-foreground">Votre compte ne dispose pas des droits nécessaires pour afficher cette page.</p>
      <ButtonLink href={user ? homeFor(user.role) : "/connexion"} className="h-11 px-6">
        {user ? "Retour à mon espace" : "Se connecter"}
      </ButtonLink>
    </main>
  );
}
