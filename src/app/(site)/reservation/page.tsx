import type { Metadata } from "next";
import { Clock3, FileText, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/blocks";
import { RequestForm } from "@/components/site/request-form";
import { getCurrentUser } from "@/server/auth";
import { listCategories, listPublishedVehicles } from "@/server/queries/catalog";
import { SERVICE_OPTIONS } from "@/lib/domain";
import { getSettings } from "@/server/settings";
import { telLink } from "@/lib/format";

export const metadata: Metadata = {
  title: "Demande de réservation ou de devis",
  description: "Réservez un véhicule avec chauffeur ou demandez un devis personnalisé à SENTRAJET PREMIUM.",
  alternates: { canonical: "/reservation" },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ReservationPage({ searchParams }: PageProps<"/reservation">) {
  const sp = await searchParams;
  const [categories, vehicles, user, settings] = await Promise.all([listCategories(), listPublishedVehicles(), getCurrentUser(), getSettings()]);
  const vehicle = vehicles.find((v) => v.slug === one(sp.vehicule));
  const service = SERVICE_OPTIONS.find((s) => s.value === one(sp.service))?.value;
  const category = categories.find((c) => c.slug === one(sp.categorie));
  const isClient = user?.role === "client";

  return (
    <>
      <PageHero
        eyebrow="Réservation"
        title={vehicle ? `Réserver : ${vehicle.brand} ${vehicle.model}` : "Votre demande en quelques minutes"}
        intro="Décrivez votre déplacement. Vous recevez immédiatement une référence, puis notre équipe vous recontacte pour confirmer."
        image="/images/chauffeur.webp"
      />
      <section className="bg-white py-10 md:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_320px]">
          <RequestForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            vehicles={vehicles.map((v) => ({ id: v.id, slug: v.slug, name: `${v.brand} ${v.model}`, categoryId: v.categoryId }))}
            defaults={{
              kind: one(sp.type) === "devis" ? "devis" : "reservation",
              serviceType: service,
              vehicleId: vehicle?.id,
              categoryId: category?.id ?? vehicle?.categoryId ?? undefined,
              contactName: isClient ? user.fullName : undefined,
              email: isClient ? user.email : undefined,
              phone: isClient ? (user.phone ?? undefined) : undefined,
              accountType: isClient ? user.accountType : undefined,
              companyName: isClient ? (user.companyName ?? undefined) : undefined,
            }}
          />
          <aside className="h-fit space-y-5 rounded-2xl bg-ink p-6 text-white lg:sticky lg:top-24">
            {[
              { icon: Clock3, title: "Réponse rapide", text: "Notre équipe traite chaque demande et vous recontacte pour confirmer les détails." },
              { icon: FileText, title: "Devis transparent", text: "Le tarif est établi selon la durée, le trajet et les options. Aucun frais caché." },
              { icon: ShieldCheck, title: "Sans engagement", text: "La demande ne vous engage pas tant que vous n'avez pas validé la proposition." },
            ].map((b) => (
              <div key={b.title} className="flex gap-3">
                <b.icon className="mt-0.5 size-5 shrink-0 text-gold" />
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-white/60">{b.text}</p>
                </div>
              </div>
            ))}
            <div className="gold-hairline" />
            <p className="text-sm text-white/60">
              Une urgence ? Appelez-nous au{" "}
              <a href={telLink(settings.company.phone)} className="font-semibold text-gold-light">
                {settings.company.phone}
              </a>
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
