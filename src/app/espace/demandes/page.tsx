import { ClientRequestList } from "@/components/app/request-list";
import { PageHeader } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requireRole } from "@/server/auth";
import { myRequests } from "@/server/queries/client";

export const metadata = { title: "Mes demandes" };

export default async function MyRequestsPage() {
  const user = await requireRole("client");
  const rows = await myRequests(user);
  return (
    <>
      <PageHeader
        title="Mes demandes"
        description="Toutes vos demandes de réservation et de devis, avec leur statut."
        actions={
          <ButtonLink href="/espace/nouvelle-demande" className="h-10 px-4">
            Nouvelle demande
          </ButtonLink>
        }
      />
      <ClientRequestList rows={rows} emptyTitle="Aucune demande" emptyText="Vos demandes envoyées depuis votre espace apparaîtront ici." />
    </>
  );
}
