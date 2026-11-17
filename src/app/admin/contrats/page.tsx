import { desc, eq } from "drizzle-orm";
import { DataTable, EmptyState, FilterBar, FilterSelect, PageHeader, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { qOf } from "@/server/queries/admin";
import { CONTRACT_STATUSES, CONTRACT_TYPES, contractTypeLabel } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Contrats" };

export default async function ContractsPage({ searchParams }: PageProps<"/admin/contrats">) {
  await requirePermission("contracts.manage");
  const sp = await searchParams;
  const type = qOf(sp, "type");
  const db = await getDb();
  const rows = await db
    .select({ c: schema.contracts, customer: schema.customers.fullName, company: schema.customers.companyName, owner: schema.owners.fullName })
    .from(schema.contracts)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.contracts.customerId))
    .leftJoin(schema.owners, eq(schema.owners.id, schema.contracts.ownerId))
    .where(type ? eq(schema.contracts.type, type) : undefined)
    .orderBy(desc(schema.contracts.createdAt))
    .limit(300);
  return (
    <>
      <PageHeader title="Contrats" actions={<ButtonLink href="/admin/contrats/nouveau">Nouveau contrat</ButtonLink>} />
      <FilterBar action="/admin/contrats" placeholder="">
        <FilterSelect name="type" value={type} options={CONTRACT_TYPES} placeholder="Tous les types" />
      </FilterBar>
      <DataTable
        columns={[
          { key: "n", label: "Contrat" },
          { key: "p", label: "Partie" },
          { key: "d", label: "Période" },
          { key: "a", label: "Montant", className: "text-right" },
          { key: "s", label: "Statut" },
        ]}
        rows={rows.map(({ c, customer, company, owner }) => ({
          key: c.id,
          href: `/admin/contrats/${c.id}`,
          cells: {
            n: (
              <span>
                <span className="block font-medium">{c.title}</span>
                <span className="text-xs text-muted-foreground">
                  {c.number} · {contractTypeLabel(c.type)}
                </span>
              </span>
            ),
            p: owner ?? company ?? customer ?? "—",
            d: c.startDate ? `${fdate(c.startDate)}${c.endDate ? ` → ${fdate(c.endDate)}` : ""}` : "—",
            a: c.amount ? fcfa(c.amount) : "—",
            s: <StatusBadge list={CONTRACT_STATUSES} value={c.status} />,
          },
        }))}
        empty={<EmptyState title="Aucun contrat" />}
      />
    </>
  );
}
