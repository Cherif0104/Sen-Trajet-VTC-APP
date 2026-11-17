import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/site/auth-forms";
import { getCurrentUser } from "@/server/auth";
import { homeFor } from "@/lib/permissions";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <section className="grid min-h-svh bg-white pt-[4.25rem] lg:grid-cols-2">
      <div className="relative hidden bg-ink lg:block">
        <Image src="/images/chauffeur.webp" alt="" fill sizes="50vw" className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute right-10 bottom-12 left-10 space-y-3 text-white">
          <p className="font-display text-4xl font-semibold">Votre mobilité, notre engagement.</p>
          <p className="text-white/65">Retrouvez vos demandes, devis, réservations et factures dans votre espace.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-semibold">Connexion</h1>
            <p className="text-muted-foreground">Accédez à votre espace client, propriétaire ou équipe.</p>
          </div>
          <LoginForm next={next} />
        </div>
      </div>
    </section>
  );
}
