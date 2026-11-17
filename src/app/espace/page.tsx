import { CalendarCheck2, ClipboardList, FileText, Receipt } from "lucide-react";
import { ClientRequestList } from "@/components/app/request-list";
import { Card, PageHeader, StatCard } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requireRole } from "@/server/auth";
import { myDashboard, myRequests } from "@/server/queries/client";
import { fcfa } from "@/lib/format";

export default async function ClientDashboard() {
  const user = await requireRole("client");
  const [stats, recent] = await Promise.all([myDashboard(user), myRequests(user, { limit: 5 })]);
  return (
    <>
      <PageHeader
        title={`Bonjour ${user.fullName.split(" ")[0]}`}
        description="Suivez vos demandes, devis, réservations et factures."
        actions={
          <ButtonLink href="/espace/nouvelle-demande" className="h-10 px-4">
            Nouvelle demande
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label="Demandes en cours" value={stats.open} href="/espace/demandes" icon={<ClipboardList className="size-4 text-gold" />} />
        <StatCard label="Réservations à venir" value={stats.upcoming} href="/espace/reservations" icon={<CalendarCheck2 className="size-4 text-gold" />} />
        <StatCard label="Devis à valider" value={stats.pendingQuotes} href="/espace/devis" icon={<FileText className="size-4 text-gold" />} />
        <StatCard
          label="Factures à régler"
          value={stats.unpaid.n}
          hint={stats.unpaid.due ? `Reste dû : ${fcfa(stats.unpaid.due)}` : undefined}
          href="/espace/factures"
          icon={<Receipt className="size-4 text-gold" />}
        />
      </div>
      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold">Dernières demandes</h2>
        <ClientRequestList rows={recent} emptyTitle="Aucune demande pour le moment" emptyText="Envoyez votre première demande de réservation ou de devis : elle apparaîtra ici avec son suivi." />
      </div>
      <Card className="mt-6" title="Besoin d'aide ?">
        <p className="text-sm text-muted-foreground">
          Notre équipe est joignable par téléphone, WhatsApp ou via le formulaire de contact de votre espace.
        </p>
      </Card>
    </>
  );
}
