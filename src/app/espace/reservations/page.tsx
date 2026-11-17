import { ClientRequestList } from "@/components/app/request-list";
import { PageHeader } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { myRequests } from "@/server/queries/client";

export const metadata = { title: "Mes réservations" };

export default async function MyReservationsPage() {
  const user = await requireRole("client");
  const rows = await myRequests(user, { reservationsOnly: true });
  return (
    <>
      <PageHeader title="Mes réservations" description="Demandes acceptées, confirmées, en cours ou terminées." />
      <ClientRequestList rows={rows} emptyTitle="Aucune réservation" emptyText="Une demande devient une réservation dès qu'elle est acceptée et confirmée par notre équipe." />
    </>
  );
}
