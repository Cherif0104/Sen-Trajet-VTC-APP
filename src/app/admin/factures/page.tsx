import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { DataTable, EmptyState, FilterBar, FilterSelect, PageHeader, Pagination, StatCard, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { PAGE_SIZE, pageOf, qOf } from "@/server/queries/admin";
import { INVOICE_STATUSES } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Facturation" };

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/factures">) {
  await requirePermission("invoices.manage");
  const sp = await searchParams;
  const q = qOf(sp);
  const status = qOf(sp, "status");
  const page = pageOf(sp);
  const db = await getDb();
  const conds: SQL[] = [];
  if (status) conds.push(eq(schema.invoices.status, status));
  if (q) conds.push(or(ilike(schema.invoices.number, `%${q}%`), ilike(schema.customers.fullName, `%${q}%`), ilike(schema.customers.companyName, `%${q}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const [rows, count, sums] = await Promise.all([
    db
      .select({ i: schema.invoices, name: schema.customers.fullName, company: schema.customers.companyName })
      .from(schema.invoices)
      .leftJoin(schema.customers, eq(schema.customers.id, schema.invoices.customerId))
      .where(where)
      .orderBy(desc(schema.invoices.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.invoices).leftJoin(schema.customers, eq(schema.customers.id, schema.invoices.customerId)).where(where),
    db
      .select({
        due: sql<number>`coalesce(sum(${schema.invoices.total} - ${schema.invoices.amountPaid}), 0)::int`,
        late: sql<number>`coalesce(sum(case when ${schema.invoices.dueAt} < ${today} then ${schema.invoices.total} - ${schema.invoices.amountPaid} end), 0)::int`,
      })
      .from(schema.invoices)
      .where(inArray(schema.invoices.status, ["emise", "partielle"])),
  ]);
  const total = count[0]?.n ?? 0;
  return (
    <>
      <PageHeader title="Facturation" actions={<ButtonLink href="/admin/factures/nouvelle">Nouvelle facture</ButtonLink>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Reste à encaisser" value={fcfa(sums[0]?.due ?? 0)} />
        <StatCard label="Dont échu" value={fcfa(sums[0]?.late ?? 0)} />
      </div>
      <FilterBar action="/admin/factures" q={q} placeholder="Numéro, client…">
        <FilterSelect name="status" value={status} options={INVOICE_STATUSES} placeholder="Tous les statuts" />
      </FilterBar>
      <DataTable
        columns={[
          { key: "n", label: "Facture" },
          { key: "c", label: "Client" },
          { key: "t", label: "Total TTC", className: "text-right" },
          { key: "r", label: "Reste dû", className: "text-right" },
          { key: "d", label: "Échéance" },
          { key: "s", label: "Statut" },
        ]}
        rows={rows.map(({ i, name, company }) => ({
          key: i.id,
          href: `/admin/factures/${i.id}`,
          cells: {
            n: <span className="whitespace-nowrap font-mono text-xs">{i.number}</span>,
            c: company ?? name ?? "—",
            t: fcfa(i.total),
            r: i.status === "annulee" ? "—" : fcfa(i.total - i.amountPaid),
            d: i.dueAt ? <span className={["emise", "partielle"].includes(i.status) && i.dueAt < today ? "font-medium text-red-600" : ""}>{fdate(i.dueAt)}</span> : "—",
            s: <StatusBadge list={INVOICE_STATUSES} value={i.status} />,
          },
        }))}
        empty={<EmptyState title="Aucune facture" text="Générez une facture depuis un devis accepté ou créez-la directement." />}
      />
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} makeHref={(p) => `/admin/factures?${new URLSearchParams({ q, status, page: String(p) })}`} />
    </>
  );
}
