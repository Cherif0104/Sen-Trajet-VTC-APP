import { asc } from "drizzle-orm";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { DRIVER_STATUSES } from "@/lib/domain";
import { fdate, isoDayFromNow } from "@/lib/format";

export const metadata = { title: "Chauffeurs" };

export default async function DriversPage() {
  await requirePermission("drivers.manage");
  const db = await getDb();
  const rows = await db.select().from(schema.drivers).orderBy(asc(schema.drivers.fullName));
  const soon = isoDayFromNow(30);
  return (
    <>
      <PageHeader title="Chauffeurs" description="Fiches chauffeurs, permis et rattachement aux comptes de l'espace chauffeur." actions={<ButtonLink href="/admin/chauffeurs/nouveau">Ajouter un chauffeur</ButtonLink>} />
      <DataTable
        columns={[
          { key: "n", label: "Chauffeur" },
          { key: "p", label: "Téléphone" },
          { key: "l", label: "Permis" },
          { key: "a", label: "Compte" },
          { key: "s", label: "Statut" },
        ]}
        rows={rows.map((d) => ({
          key: d.id,
          href: `/admin/chauffeurs/${d.id}`,
          cells: {
            n: d.fullName,
            p: d.phone ?? "—",
            l: d.licenseExpiry ? (
              <span className={d.licenseExpiry <= soon ? "font-medium text-red-600" : ""}>Expire le {fdate(d.licenseExpiry)}</span>
            ) : (
              <span className="text-muted-foreground">Non renseigné</span>
            ),
            a: d.userId ? "Rattaché" : <span className="text-muted-foreground">Sans compte</span>,
            s: <StatusBadge list={DRIVER_STATUSES} value={d.status} />,
          },
        }))}
        empty={<EmptyState title="Aucun chauffeur" action={<ButtonLink href="/admin/chauffeurs/nouveau">Ajouter un chauffeur</ButtonLink>} />}
      />
    </>
  );
}
