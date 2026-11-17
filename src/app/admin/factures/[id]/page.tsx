import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Download } from "lucide-react";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { InvoiceForm } from "@/components/app/invoice-form";
import { Card, KeyValues, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/forms";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { customerOptions } from "@/server/queries/admin";
import { cancelInvoice, issueInvoice, recordPayment } from "@/server/actions/admin-finance";
import { INVOICE_STATUSES, PAYMENT_METHODS, paymentMethodLabel } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export default async function InvoiceDetail({ params }: PageProps<"/admin/factures/[id]">) {
  await requirePermission("invoices.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).limit(1);
  if (!inv) notFound();
  const [customer, payments, customers, quote, request] = await Promise.all([
    inv.customerId ? db.select().from(schema.customers).where(eq(schema.customers.id, inv.customerId)).then((r) => r[0]) : undefined,
    db.select().from(schema.payments).where(eq(schema.payments.invoiceId, id)).orderBy(desc(schema.payments.paidAt)),
    inv.status === "brouillon" ? customerOptions() : Promise.resolve([]),
    inv.quoteId ? db.select({ id: schema.quotes.id, number: schema.quotes.number }).from(schema.quotes).where(eq(schema.quotes.id, inv.quoteId)).then((r) => r[0]) : undefined,
    inv.requestId ? db.select({ id: schema.requests.id, reference: schema.requests.reference }).from(schema.requests).where(eq(schema.requests.id, inv.requestId)).then((r) => r[0]) : undefined,
  ]);
  const remaining = inv.total - inv.amountPaid;
  const draft = inv.status === "brouillon";
  return (
    <>
      <PageHeader
        back={{ href: "/admin/factures", label: "Facturation" }}
        title={`Facture ${inv.number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge list={INVOICE_STATUSES} value={inv.status} />
            {inv.issuedAt && `Émise le ${fdate(inv.issuedAt)}`}
            {quote && (
              <a href={`/admin/devis/${quote.id}`} className="text-gold hover:underline">
                · Devis {quote.number}
              </a>
            )}
            {request && (
              <a href={`/admin/demandes/${request.id}`} className="text-gold hover:underline">
                · Demande {request.reference}
              </a>
            )}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/api/pdf/facture/${inv.id}`} target="_blank" variant="outline">
              <Download className="size-4" /> PDF
            </ButtonLink>
            {draft && (
              <ConfirmActionButton action={issueInvoice} fields={{ id: inv.id }} confirm={`Émettre la facture ${inv.number} (${fcfa(inv.total)} TTC) ? Elle ne sera plus modifiable et le client sera notifié.`}>
                Émettre la facture
              </ConfirmActionButton>
            )}
            {inv.status !== "annulee" && inv.amountPaid === 0 && (
              <ConfirmActionButton action={cancelInvoice} fields={{ id: inv.id }} confirm="Annuler cette facture ? Elle restera dans l'historique." variant="ghost" className="text-destructive">
                Annuler
              </ConfirmActionButton>
            )}
          </>
        }
      />
      {draft ? (
        <Card title="Modifier le brouillon">
          <InvoiceForm invoice={inv} customers={customers} defaults={{ taxRate: inv.taxRate }} />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card title="Détail">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Désignation</th>
                  <th className="pb-2 text-right font-medium">Qté</th>
                  <th className="pb-2 text-right font-medium">PU HT</th>
                  <th className="pb-2 text-right font-medium">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inv.items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2">{it.label}</td>
                    <td className="py-2 text-right">{it.quantity}</td>
                    <td className="py-2 text-right">{fcfa(it.unitPrice)}</td>
                    <td className="py-2 text-right">{fcfa(it.quantity * it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <p className="flex justify-between"><span>Total HT</span><span>{fcfa(inv.subtotal)}</span></p>
              <p className="flex justify-between"><span>TVA {inv.taxRate} %</span><span>{fcfa(inv.taxAmount)}</span></p>
              <p className="flex justify-between border-t border-border pt-1 text-base font-semibold"><span>Total TTC</span><span>{fcfa(inv.total)}</span></p>
              <p className="flex justify-between text-emerald-700"><span>Déjà réglé</span><span>{fcfa(inv.amountPaid)}</span></p>
              <p className="flex justify-between font-semibold"><span>Reste dû</span><span>{fcfa(remaining)}</span></p>
            </div>
          </Card>
          <div className="space-y-6">
            <Card title="Client">
              <KeyValues
                className="sm:grid-cols-1"
                items={[
                  ["Client", customer ? <a key="c" href={`/admin/clients/${customer.id}`} className="text-gold hover:underline">{customer.companyName ?? customer.fullName}</a> : "—"],
                  ["E-mail", customer?.email],
                  ["Échéance", inv.dueAt ? fdate(inv.dueAt) : null],
                ]}
              />
            </Card>
            {["emise", "partielle"].includes(inv.status) && (
              <Card title="Enregistrer un paiement">
                <ActionForm action={recordPayment} className="space-y-4" resetOnSuccess>
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField name="amount" type="number" label="Montant (FCFA)" required defaultValue={remaining} />
                    <TextField name="paidAt" type="date" label="Date" defaultValue={new Date().toISOString().slice(0, 10)} />
                    <SelectField name="method" label="Moyen" options={PAYMENT_METHODS} defaultValue="virement" />
                    <TextField name="reference" label="Référence de transaction" />
                  </div>
                  <SubmitButton className="w-full">Enregistrer le paiement</SubmitButton>
                </ActionForm>
              </Card>
            )}
            <Card title="Paiements reçus">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun paiement.</p>
              ) : (
                <ul className="-my-2 divide-y divide-border text-sm">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2.5">
                      <span>
                        {fdate(p.paidAt)} · {paymentMethodLabel(p.method)}
                        {p.reference && <span className="block text-xs text-muted-foreground">{p.reference}</span>}
                      </span>
                      <span className="font-medium">{fcfa(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
