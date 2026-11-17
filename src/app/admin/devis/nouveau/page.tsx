import { eq } from "drizzle-orm";
import { QuoteForm } from "@/components/app/quote-form";
import { Card, PageHeader } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { customerOptions } from "@/server/queries/admin";
import { getSettings } from "@/server/settings";
import { serviceLabel } from "@/lib/domain";
import { fdate, isoDayFromNow } from "@/lib/format";

export const metadata = { title: "Nouveau devis" };

export default async function NewQuotePage({ searchParams }: PageProps<"/admin/devis/nouveau">) {
  await requirePermission("quotes.manage");
  const sp = await searchParams;
  const requestId = typeof sp.demande === "string" && /^[0-9a-f-]{36}$/.test(sp.demande) ? sp.demande : undefined;
  const preCustomer = typeof sp.client === "string" ? sp.client : undefined;
  const db = await getDb();
  const [settings, customers, request] = await Promise.all([
    getSettings(),
    customerOptions(),
    requestId ? db.select().from(schema.requests).where(eq(schema.requests.id, requestId)).then((r) => r[0]) : undefined,
  ]);
  const validUntil = isoDayFromNow(settings.finance.quoteValidityDays);
  const label = request
    ? `${serviceLabel(request.serviceType)}${request.startDate ? ` — ${fdate(request.startDate)}` : ""}${request.pickup ? ` — ${request.pickup}` : ""}${request.destination ? ` → ${request.destination}` : ""}`
    : "";

  return (
    <>
      <PageHeader
        back={request ? { href: `/admin/demandes/${request.id}`, label: `Demande ${request.reference}` } : { href: "/admin/devis", label: "Devis" }}
        title="Nouveau devis"
        description="Les montants sont saisis hors taxes ; la TVA est calculée automatiquement."
      />
      <Card>
        <QuoteForm
          requestId={request?.id}
          customers={customers}
          defaults={{
            customerId: request?.customerId ?? preCustomer,
            items: label ? [{ label, quantity: 1, unitPrice: 0 }] : [],
            taxRate: settings.finance.taxRate,
            validUntil,
            notes: settings.finance.paymentTerms,
          }}
        />
      </Card>
    </>
  );
}
