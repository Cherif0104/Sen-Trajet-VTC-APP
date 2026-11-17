import { PageHeader } from "@/components/app/ui";
import { RequestForm } from "@/components/site/request-form";
import { requireRole } from "@/server/auth";
import { listCategories, listPublishedVehicles } from "@/server/queries/catalog";

export const metadata = { title: "Nouvelle demande" };

export default async function NewClientRequest() {
  const user = await requireRole("client");
  const [categories, vehicles] = await Promise.all([listCategories(), listPublishedVehicles()]);
  return (
    <>
      <PageHeader title="Nouvelle demande" description="Réservation ou devis : vos coordonnées sont déjà renseignées." />
      <div className="rounded-2xl border border-border bg-white p-4 md:p-8">
        <RequestForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          vehicles={vehicles.map((v) => ({ id: v.id, slug: v.slug, name: `${v.brand} ${v.model}`, categoryId: v.categoryId }))}
          defaults={{
            kind: "reservation",
            contactName: user.fullName,
            email: user.email,
            phone: user.phone ?? undefined,
            accountType: user.accountType,
            companyName: user.companyName ?? undefined,
          }}
        />
      </div>
    </>
  );
}
