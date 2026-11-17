import { asc, sql } from "drizzle-orm";
import { OwnerTabs } from "@/components/app/owner-tabs";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { OWNER_STATUSES } from "@/lib/domain";

export const metadata = { title: "Propriétaires" };

export default async function OwnersPage() {
  await requirePermission("owners.manage");
  const db = await getDb();
  const rows = await db
    .select({
      o: schema.owners,
      subs: sql<number>`(select count(*)::int from owner_submissions s where s.owner_id = ${schema.owners.id})`,
      vehicles: sql<number>`(select count(*)::int from vehicles v where v.owner_id = ${schema.owners.id})`,
    })
    .from(schema.owners)
    .orderBy(asc(schema.owners.fullName));
  return (
    <>
      <PageHeader title="Propriétaires partenaires" actions={<ButtonLink href="/admin/proprietaires/nouveau">Ajouter un propriétaire</ButtonLink>} />
      <OwnerTabs active="owners" />
      <DataTable
        columns={[
          { key: "n", label: "Propriétaire" },
          { key: "c", label: "Contact" },
          { key: "s", label: "Propositions", className: "text-right" },
          { key: "v", label: "En flotte", className: "text-right" },
          { key: "st", label: "Statut" },
        ]}
        rows={rows.map(({ o, subs, vehicles }) => ({
          key: o.id,
          href: `/admin/proprietaires/${o.id}`,
          cells: {
            n: (
              <span>
                <span className="block font-medium">{o.fullName}</span>
                {o.companyName && <span className="text-xs text-muted-foreground">{o.companyName}</span>}
              </span>
            ),
            c: (
              <span className="text-xs">
                {o.email}
                <span className="block text-muted-foreground">{o.phone}</span>
              </span>
            ),
            s: subs,
            v: vehicles,
            st: <StatusBadge list={OWNER_STATUSES} value={o.status} />,
          },
        }))}
        empty={<EmptyState title="Aucun propriétaire" text="Les propriétaires s'inscrivent depuis la page « Devenir partenaire propriétaire »." />}
      />
    </>
  );
}
