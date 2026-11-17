import { eq } from "drizzle-orm";
import { InvoiceForm } from "@/components/app/invoice-form";
import { Card, PageHeader } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { customerOptions } from "@/server/queries/admin";
import { getSettings } from "@/server/settings";
import { serviceLabel } from "@/lib/domain";
import { fdate } from "@/lib/format";

export const metadata = { title: "Nouvelle facture" };

const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/.test(v) ? v : undefined);

export default async function NewInvoice({ searchParams }: PageProps<"/admin/factures/nouvelle">) {
  await requirePermission("invoices.manage");
  const sp = await searchParams;
  const db = await getDb();
  const quoteId = uuid(sp.devis);
  const requestIdParam = uuid(sp.demande);
  const [settings, customers, quote] = await Promise.all([
    getSettings(),
    customerOptions(),
    quoteId ? db.select().from(schema.quotes).where(eq(schema.quotes.id, quoteId)).then((r) => r[0]) : undefined,
  ]);
  const requestId = quote?.requestId ?? requestIdParam;
  const request = requestId ? (await db.select().from(schema.requests).where(eq(schema.requests.id, requestId)))[0] : undefined;
  const dueAt = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const label = request ? `${serviceLabel(request.serviceType)}${request.startDate ? ` — ${fdate(request.startDate)}` : ""} (réf. ${request.reference})` : "";

  return (
    <>
      <PageHeader
        back={quote ? { href: `/admin/devis/${quote.id}`, label: `Devis ${quote.number}` } : { href: "/admin/factures", label: "Facturation" }}
        title="Nouvelle facture"
        description={quote ? `Lignes reprises du devis ${quote.number}.` : "La facture est créée en brouillon ; vous l'émettez ensuite."}
      />
      <Card>
        <InvoiceForm
          customers={customers}
          defaults={{
            quoteId: quote?.id,
            requestId: request?.id,
            customerId: quote?.customerId ?? request?.customerId,
            items: quote?.items ?? (label ? [{ label, quantity: 1, unitPrice: 0 }] : []),
            taxRate: quote?.taxRate ?? settings.finance.taxRate,
            dueAt,
            notes: settings.finance.paymentTerms,
          }}
        />
      </Card>
    </>
  );
}
