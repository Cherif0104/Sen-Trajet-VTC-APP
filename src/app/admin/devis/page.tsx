import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { DataTable, EmptyState, FilterBar, FilterSelect, PageHeader, Pagination, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { PAGE_SIZE, pageOf, qOf } from "@/server/queries/admin";
import { QUOTE_STATUSES } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Devis" };

export default async function AdminQuotes({ searchParams }: PageProps<"/admin/devis">) {
  await requirePermission("quotes.manage");
  const sp = await searchParams;
  const q = qOf(sp);
  const status = qOf(sp, "status");
  const page = pageOf(sp);
  const db = await getDb();
  const conds: SQL[] = [];
  if (status) conds.push(eq(schema.quotes.status, status));
  if (q) conds.push(or(ilike(schema.quotes.number, `%${q}%`), ilike(schema.customers.fullName, `%${q}%`), ilike(schema.customers.companyName, `%${q}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const base = db
    .select({ q: schema.quotes, name: schema.customers.fullName, company: schema.customers.companyName, ref: schema.requests.reference })
    .from(schema.quotes)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.quotes.customerId))
    .leftJoin(schema.requests, eq(schema.requests.id, schema.quotes.requestId))
    .where(where);
  const [rows, all] = await Promise.all([
    base.orderBy(desc(schema.quotes.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ id: schema.quotes.id }).from(schema.quotes).leftJoin(schema.customers, eq(schema.customers.id, schema.quotes.customerId)).where(where),
  ]);
  return (
    <>
      <PageHeader title="Devis" description={`${all.length} devis`} actions={<ButtonLink href="/admin/devis/nouveau">Nouveau devis</ButtonLink>} />
      <FilterBar action="/admin/devis" q={q} placeholder="Numéro, client…">
        <FilterSelect name="status" value={status} options={QUOTE_STATUSES} placeholder="Tous les statuts" />
      </FilterBar>
      <DataTable
        columns={[
          { key: "n", label: "Numéro" },
          { key: "c", label: "Client" },
          { key: "r", label: "Demande" },
          { key: "t", label: "Total TTC", className: "text-right" },
          { key: "s", label: "Statut" },
          { key: "d", label: "Créé le", className: "text-right" },
        ]}
        rows={rows.map(({ q: x, name, company, ref }) => ({
          key: x.id,
          href: `/admin/devis/${x.id}`,
          cells: {
            n: <span className="font-mono text-xs">{x.number}</span>,
            c: company ?? name ?? "—",
            r: <span className="font-mono text-xs text-muted-foreground">{ref ?? "—"}</span>,
            t: <span className="font-medium">{fcfa(x.total)}</span>,
            s: <StatusBadge list={QUOTE_STATUSES} value={x.status} />,
            d: <span className="text-xs text-muted-foreground">{fdate(x.createdAt)}</span>,
          },
        }))}
        empty={<EmptyState title="Aucun devis" text="Créez un devis depuis une demande ou directement pour un client." action={<ButtonLink href="/admin/devis/nouveau">Nouveau devis</ButtonLink>} />}
      />
      <Pagination page={page} pageCount={Math.ceil(all.length / PAGE_SIZE)} makeHref={(p) => `/admin/devis?${new URLSearchParams({ q, status, page: String(p) })}`} />
    </>
  );
}
