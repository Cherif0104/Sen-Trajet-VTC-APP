import { desc, eq } from "drizzle-orm";
import { OwnerTabs } from "@/components/app/owner-tabs";
import { DataTable, EmptyState, FilterBar, FilterSelect, PageHeader, StatusBadge } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { qOf } from "@/server/queries/admin";
import { SUBMISSION_STATUSES } from "@/lib/domain";
import { fdate } from "@/lib/format";

export const metadata = { title: "Véhicules proposés" };

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/proprietaires/soumissions">) {
  await requirePermission("owners.manage");
  const sp = await searchParams;
  const status = qOf(sp, "status");
  const db = await getDb();
  const rows = await db
    .select({ s: schema.ownerSubmissions, owner: schema.owners.fullName })
    .from(schema.ownerSubmissions)
    .innerJoin(schema.owners, eq(schema.owners.id, schema.ownerSubmissions.ownerId))
    .where(status ? eq(schema.ownerSubmissions.status, status) : undefined)
    .orderBy(desc(schema.ownerSubmissions.createdAt))
    .limit(200);
  return (
    <>
      <PageHeader title="Propriétaires partenaires" />
      <OwnerTabs active="submissions" />
      <FilterBar action="/admin/proprietaires/soumissions" placeholder="">
        <FilterSelect name="status" value={status} options={SUBMISSION_STATUSES} placeholder="Toutes les étapes" />
      </FilterBar>
      <DataTable
        columns={[
          { key: "v", label: "Véhicule" },
          { key: "o", label: "Propriétaire" },
          { key: "s", label: "Étape" },
          { key: "d", label: "Reçu le", className: "text-right" },
        ]}
        rows={rows.map(({ s, owner }) => ({
          key: s.id,
          href: `/admin/proprietaires/soumissions/${s.id}`,
          cells: {
            v: (
              <span>
                <span className="block font-medium">
                  {s.brand} {s.model} {s.year ?? ""}
                </span>
                <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">{s.reference}</span>
              </span>
            ),
            o: owner,
            s: <StatusBadge list={SUBMISSION_STATUSES} value={s.status} />,
            d: <span className="text-xs text-muted-foreground">{fdate(s.createdAt)}</span>,
          },
        }))}
        empty={<EmptyState title="Aucun véhicule proposé" />}
      />
    </>
  );
}
