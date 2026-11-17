import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Badge, DataTable, EmptyState, FilterBar, FilterSelect, PageHeader, Pagination } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { PAGE_SIZE, pageOf, qOf } from "@/server/queries/admin";
import { ACCOUNT_TYPES, accountTypeLabel } from "@/lib/domain";
import { fdate } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/clients">) {
  await requirePermission("customers.manage");
  const sp = await searchParams;
  const q = qOf(sp);
  const type = qOf(sp, "type");
  const page = pageOf(sp);
  const db = await getDb();
  const conds: SQL[] = [];
  if (type) conds.push(eq(schema.customers.type, type));
  if (q)
    conds.push(
      or(ilike(schema.customers.fullName, `%${q}%`), ilike(schema.customers.companyName, `%${q}%`), ilike(schema.customers.email, `%${q}%`), ilike(schema.customers.phone, `%${q}%`))!,
    );
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select({
        c: schema.customers,
        requests: sql<number>`(select count(*)::int from requests r where r.customer_id = ${schema.customers.id})`,
      })
      .from(schema.customers)
      .where(where)
      .orderBy(desc(schema.customers.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.$count(schema.customers, where),
  ]);
  return (
    <>
      <PageHeader title="Clients (CRM)" description={`${total} client(s)`} actions={<ButtonLink href="/admin/clients/nouveau">Nouveau client</ButtonLink>} />
      <FilterBar action="/admin/clients" q={q} placeholder="Nom, structure, e-mail, téléphone…">
        <FilterSelect name="type" value={type} options={ACCOUNT_TYPES} placeholder="Tous les types" />
      </FilterBar>
      <DataTable
        columns={[
          { key: "n", label: "Client" },
          { key: "t", label: "Type" },
          { key: "c", label: "Contact" },
          { key: "r", label: "Demandes", className: "text-right" },
          { key: "d", label: "Depuis", className: "text-right" },
        ]}
        rows={rows.map(({ c, requests }) => ({
          key: c.id,
          href: `/admin/clients/${c.id}`,
          cells: {
            n: (
              <span>
                <span className="block font-medium">{c.companyName ?? c.fullName}</span>
                {c.companyName && <span className="text-xs text-muted-foreground">{c.fullName}</span>}
              </span>
            ),
            t: (
              <span className="flex flex-wrap gap-1">
                <Badge>{accountTypeLabel(c.type)}</Badge>
                {c.userId && <Badge tone="gold">Compte</Badge>}
              </span>
            ),
            c: (
              <span className="text-xs">
                {c.email}
                <span className="block text-muted-foreground">{c.phone}</span>
              </span>
            ),
            r: requests,
            d: <span className="text-xs text-muted-foreground">{fdate(c.createdAt)}</span>,
          },
        }))}
        empty={<EmptyState title="Aucun client" text="Les clients sont créés automatiquement à chaque demande, ou manuellement." />}
      />
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} makeHref={(p) => `/admin/clients?${new URLSearchParams({ q, type, page: String(p) })}`} />
    </>
  );
}
