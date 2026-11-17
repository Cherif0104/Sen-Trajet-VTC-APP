import { and, asc, gte, lte } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { audit } from "@/server/core";
import { getDb, schema } from "@/server/db";
import { formatMoney, renderSummaryPdf } from "@/server/pdf";
import { financeReport, periodOf } from "@/server/queries/finance";
import { getSettings } from "@/server/settings";
import { accountTypeLabel, expenseCategoryLabel, invoiceStatusLabel, paymentMethodLabel, requestStatusLabel, serviceLabel } from "@/lib/domain";
import { can } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request, ctx: RouteContext<"/api/export/[kind]">) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "reports.view")) return new Response("Accès refusé", { status: 403 });
  const { kind } = await ctx.params;
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const period = periodOf(sp);
  const name = `sentrajet-${kind}-${period.from}_${period.to}`;
  const csv = (body: string) =>
    new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "no-store" } });

  if (kind === "synthese") {
    const [r, settings] = await Promise.all([financeReport(period), getSettings()]);
    const t = r.totals;
    const bytes = await renderSummaryPdf({
      settings,
      ...period,
      sections: [
        { title: "Chiffre d'affaires facture", rows: [["Total HT", formatMoney(t.billedHt)], ["TVA collectee", formatMoney(t.billedTax)], ["Total TTC", formatMoney(t.billedTtc)], ["Nombre de factures", String(r.invoices.length)]] },
        { title: "Tresorerie", rows: [["Encaissements", formatMoney(t.cashIn)], ["Reversements proprietaires", formatMoney(t.payouts)], ["Depenses TTC", formatMoney(t.expTtc)], ["Solde", formatMoney(t.net)]] },
        { title: "TVA (indicatif)", rows: [["TVA collectee", formatMoney(t.billedTax)], ["TVA deductible", formatMoney(t.expTax)], ["Solde", formatMoney(t.vatBalance)]] },
        { title: "Depenses par categorie", rows: r.byCategory.length ? r.byCategory.map(([c, a]) => [expenseCategoryLabel(c), formatMoney(a)] as [string, string]) : [["Aucune depense", "-"]] },
      ],
    });
    await audit(user.id, "export.synthese", "report", null, period);
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}.pdf"`, "Cache-Control": "no-store" } });
  }

  if (kind === "factures" || kind === "paiements" || kind === "depenses") {
    const r = await financeReport(period);
    await audit(user.id, `export.${kind}`, "report", null, period);
    if (kind === "factures")
      return csv(
        toCsv(
          ["Numero", "Date emission", "Echeance", "Client", "Statut", "Total HT", "Taux TVA", "TVA", "Total TTC", "Deja paye", "Reste du"],
          r.invoices.map(({ i, name, company }) => [i.number, i.issuedAt, i.dueAt, company ?? name, invoiceStatusLabel(i.status), i.subtotal, i.taxRate, i.taxAmount, i.total, i.amountPaid, i.total - i.amountPaid]),
        ),
      );
    if (kind === "paiements")
      return csv(
        toCsv(
          ["Date", "Sens", "Montant", "Moyen", "Reference", "Facture", "Proprietaire", "Notes"],
          r.payments.map(({ p, invoice, owner }) => [p.paidAt, p.direction === "encaissement" ? "Encaissement" : "Reversement", p.amount, paymentMethodLabel(p.method), p.reference, invoice, owner, p.notes]),
        ),
      );
    return csv(
      toCsv(
        ["Date", "Categorie", "Libelle", "Fournisseur", "Vehicule", "Montant HT", "TVA", "Montant TTC"],
        r.expenses.map(({ e, brand, model }) => [e.spentAt, expenseCategoryLabel(e.category), e.label, e.supplier, brand ? `${brand} ${model}` : "", e.amountHt, e.taxAmount, e.amountTtc]),
      ),
    );
  }

  if (kind === "demandes") {
    if (!can(user.role, "requests.manage")) return new Response("Accès refusé", { status: 403 });
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.requests)
      .where(and(gte(schema.requests.createdAt, new Date(`${period.from}T00:00:00Z`)), lte(schema.requests.createdAt, new Date(`${period.to}T23:59:59Z`))))
      .orderBy(asc(schema.requests.createdAt));
    await audit(user.id, "export.demandes", "report", null, period);
    return csv(
      toCsv(
        ["Reference", "Recue le", "Type", "Prestation", "Statut", "Contact", "Type de compte", "Structure", "Telephone", "E-mail", "Date souhaitee", "Depart", "Destination", "Passagers"],
        rows.map((r) => [
          r.reference,
          r.createdAt.toISOString().slice(0, 16).replace("T", " "),
          r.kind === "reservation" ? "Reservation" : "Devis",
          serviceLabel(r.serviceType),
          requestStatusLabel(r.status),
          r.contactName,
          accountTypeLabel(r.accountType),
          r.companyName,
          r.phone,
          r.email,
          r.startDate,
          r.pickup,
          r.destination,
          r.passengers,
        ]),
      ),
    );
  }
  return new Response("Export inconnu", { status: 404 });
}
