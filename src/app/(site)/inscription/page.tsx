import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/site/auth-forms";
import { getCurrentUser } from "@/server/auth";
import { homeFor } from "@/lib/permissions";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/inscription">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <section className="bg-mist pt-[4.25rem]">
      <div className="container-page max-w-2xl py-12 md:py-16">
        <div className="space-y-8 rounded-3xl border border-border bg-white p-6 md:p-10">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-semibold">Créer votre compte</h1>
            <p className="text-muted-foreground">Particuliers, entreprises, organisations, institutions et propriétaires de véhicules.</p>
          </div>
          <RegisterForm defaultProfile={sp.profil === "proprietaire" ? "proprietaire" : "client"} />
        </div>
      </div>
    </section>
  );
}
