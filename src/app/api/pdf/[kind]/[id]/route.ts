import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { renderCommercialPdf } from "@/server/pdf";
import { getSettings } from "@/server/settings";
import { myCustomerIds } from "@/server/queries/client";
import { audit } from "@/server/core";
import { can } from "@/lib/permissions";
import { fdate } from "@/lib/format";

export async function GET(_req: Request, ctx: RouteContext<"/api/pdf/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || (kind !== "devis" && kind !== "facture")) return new Response("Introuvable", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Authentification requise", { status: 401 });
  const db = await getDb();

  const doc =
    kind === "devis"
      ? (await db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).limit(1))[0]
      : (await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).limit(1))[0];
  if (!doc) return new Response("Introuvable", { status: 404 });

  const staffAllowed = can(user.role, kind === "devis" ? "quotes.manage" : "invoices.manage");
  if (!staffAllowed) {
    const ids = user.role === "client" ? await myCustomerIds(user.id) : [];
    if (!doc.customerId || !ids.includes(doc.customerId) || doc.status === "brouillon") return new Response("Accès refusé", { status: 403 });
  }

  const [customer] = doc.customerId ? await db.select().from(schema.customers).where(eq(schema.customers.id, doc.customerId)).limit(1) : [];
  const [request] = doc.requestId
    ? await db.select({ reference: schema.requests.reference }).from(schema.requests).where(eq(schema.requests.id, doc.requestId)).limit(1)
    : [];
  const settings = await getSettings();
  const isQuote = kind === "devis";
  const quote = doc as typeof schema.quotes.$inferSelect;
  const invoice = doc as typeof schema.invoices.$inferSelect;

  const bytes = await renderCommercialPdf({
    kind: isQuote ? "DEVIS" : "FACTURE",
    number: doc.number,
    date: fdate(isQuote ? quote.createdAt : (invoice.issuedAt ?? invoice.createdAt)),
    secondaryDate: isQuote
      ? quote.validUntil
        ? { label: "Valable jusqu'au", value: fdate(quote.validUntil) }
        : undefined
      : invoice.dueAt
        ? { label: "Échéance", value: fdate(invoice.dueAt) }
        : undefined,
    reference: request?.reference,
    client: {
      name: customer?.fullName ?? "Client",
      company: customer?.companyName,
      email: customer?.email,
      phone: customer?.phone,
      address: [customer?.address, customer?.city].filter(Boolean).join(", ") || null,
    },
    items: doc.items,
    subtotal: doc.subtotal,
    taxRate: doc.taxRate,
    taxAmount: doc.taxAmount,
    total: doc.total,
    amountPaid: isQuote ? undefined : invoice.amountPaid,
    notes: doc.notes,
    settings,
  });
  await audit(user.id, `pdf.${kind}`, kind === "devis" ? "quote" : "invoice", doc.id);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
