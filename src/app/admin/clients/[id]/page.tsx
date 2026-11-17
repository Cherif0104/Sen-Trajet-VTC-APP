import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { CustomerForm } from "@/components/app/customer-form";
import { Card, PageHeader, StatCard, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { INVOICE_STATUSES, QUOTE_STATUSES, REQUEST_STATUSES, serviceLabel } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";
import { can } from "@/lib/permissions";

export default async function CustomerDetail({ params }: PageProps<"/admin/clients/[id]">) {
  const user = await requirePermission("customers.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [c] = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
  if (!c) notFound();
  const [requests, quotes, invoices, totals] = await Promise.all([
    db.select().from(schema.requests).where(eq(schema.requests.customerId, id)).orderBy(desc(schema.requests.createdAt)).limit(50),
    db.select().from(schema.quotes).where(eq(schema.quotes.customerId, id)).orderBy(desc(schema.quotes.createdAt)).limit(50),
    db.select().from(schema.invoices).where(eq(schema.invoices.customerId, id)).orderBy(desc(schema.invoices.createdAt)).limit(50),
    db
      .select({
        billed: sql<number>`coalesce(sum(case when ${schema.invoices.status} <> 'annulee' and ${schema.invoices.status} <> 'brouillon' then ${schema.invoices.total} end), 0)::int`,
        paid: sql<number>`coalesce(sum(case when ${schema.invoices.status} <> 'annulee' then ${schema.invoices.amountPaid} end), 0)::int`,
      })
      .from(schema.invoices)
      .where(eq(schema.invoices.customerId, id)),
  ]);
  const t = totals[0] ?? { billed: 0, paid: 0 };
  return (
    <>
      <PageHeader
        back={{ href: "/admin/clients", label: "Clients" }}
        title={c.companyName ?? c.fullName}
        description={c.userId ? "Dispose d'un compte sur l'espace client" : "Pas de compte sur l'espace client"}
        actions={can(user.role, "quotes.manage") && <ButtonLink href={`/admin/devis/nouveau?client=${c.id}`}>Créer un devis</ButtonLink>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Demandes" value={requests.length} />
        <StatCard label="Facturé TTC" value={fcfa(t.billed)} />
        <StatCard label="Reste à payer" value={fcfa(Math.max(0, t.billed - t.paid))} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="Fiche">
          <CustomerForm customer={c} />
        </Card>
        <div className="space-y-6">
          <Card title="Demandes">
            <SimpleList
              empty="Aucune demande."
              items={requests.map((r) => ({ id: r.id, href: `/admin/demandes/${r.id}`, title: `${r.reference} · ${serviceLabel(r.serviceType)}`, meta: fdate(r.createdAt), badge: <StatusBadge list={REQUEST_STATUSES} value={r.status} /> }))}
            />
          </Card>
          <Card title="Devis">
            <SimpleList
              empty="Aucun devis."
              items={quotes.map((q) => ({ id: q.id, href: `/admin/devis/${q.id}`, title: q.number, meta: fcfa(q.total), badge: <StatusBadge list={QUOTE_STATUSES} value={q.status} /> }))}
            />
          </Card>
          <Card title="Factures">
            <SimpleList
              empty="Aucune facture."
              items={invoices.map((i) => ({ id: i.id, href: `/admin/factures/${i.id}`, title: i.number, meta: fcfa(i.total), badge: <StatusBadge list={INVOICE_STATUSES} value={i.status} /> }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function SimpleList({ items, empty }: { items: { id: string; href: string; title: string; meta: string; badge: React.ReactNode }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="-my-2 divide-y divide-border text-sm">
      {items.map((i) => (
        <li key={i.id}>
          <a href={i.href} className="flex items-center justify-between gap-2 py-2.5 hover:text-gold">
            <span className="truncate">{i.title}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {i.meta} {i.badge}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
