import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Download } from "lucide-react";
import { QuoteForm } from "@/components/app/quote-form";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Card, KeyValues, PageHeader, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { customerOptions } from "@/server/queries/admin";
import { deleteDraftQuote, duplicateQuote, sendQuote, setQuoteStatus } from "@/server/actions/admin-commercial";
import { QUOTE_STATUSES } from "@/lib/domain";
import { fcfa, fdate, fdatetime } from "@/lib/format";
import { can } from "@/lib/permissions";

export default async function QuoteDetail({ params }: PageProps<"/admin/devis/[id]">) {
  const user = await requirePermission("quotes.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [q] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).limit(1);
  if (!q) notFound();
  const [customer, request, invoice, customers] = await Promise.all([
    q.customerId ? db.select().from(schema.customers).where(eq(schema.customers.id, q.customerId)).then((r) => r[0]) : undefined,
    q.requestId ? db.select().from(schema.requests).where(eq(schema.requests.id, q.requestId)).then((r) => r[0]) : undefined,
    db.select({ id: schema.invoices.id, number: schema.invoices.number }).from(schema.invoices).where(eq(schema.invoices.quoteId, q.id)).then((r) => r[0]),
    q.status === "brouillon" ? customerOptions() : Promise.resolve([]),
  ]);
  const draft = q.status === "brouillon";

  return (
    <>
      <PageHeader
        back={request ? { href: `/admin/demandes/${request.id}`, label: `Demande ${request.reference}` } : { href: "/admin/devis", label: "Devis" }}
        title={`Devis ${q.number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge list={QUOTE_STATUSES} value={q.status} />
            {q.sentAt && `Envoyé le ${fdatetime(q.sentAt)}`}
            {q.respondedAt && ` · Réponse le ${fdatetime(q.respondedAt)}`}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/api/pdf/devis/${q.id}`} variant="outline" target="_blank">
              <Download className="size-4" /> PDF
            </ButtonLink>
            {draft && (
              <ConfirmActionButton action={sendQuote} fields={{ id: q.id }} confirm={`Envoyer le devis ${q.number} (${fcfa(q.total)} TTC) au client par e-mail ?`} success="Devis envoyé au client.">
                Envoyer au client
              </ConfirmActionButton>
            )}
            {q.status === "accepte" && can(user.role, "invoices.manage") && !invoice && <ButtonLink href={`/admin/factures/nouvelle?devis=${q.id}`}>Générer la facture</ButtonLink>}
            {invoice && (
              <ButtonLink href={`/admin/factures/${invoice.id}`} variant="outline">
                Facture {invoice.number}
              </ButtonLink>
            )}
          </>
        }
      />

      {draft ? (
        <div className="space-y-4">
          <Card title="Modifier le brouillon">
            <QuoteForm quote={q} customers={customers} defaults={{ taxRate: q.taxRate, validUntil: q.validUntil ?? "" }} />
          </Card>
          <div className="flex justify-end">
            <ConfirmActionButton action={deleteDraftQuote} fields={{ id: q.id }} confirm="Supprimer définitivement ce brouillon ?" variant="ghost" className="text-destructive">
              Supprimer le brouillon
            </ConfirmActionButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
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
                {q.items.map((it, i) => (
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
              <p className="flex justify-between"><span>Total HT</span><span>{fcfa(q.subtotal)}</span></p>
              <p className="flex justify-between"><span>TVA {q.taxRate} %</span><span>{fcfa(q.taxAmount)}</span></p>
              <p className="flex justify-between border-t border-border pt-1 text-base font-semibold"><span>Total TTC</span><span>{fcfa(q.total)}</span></p>
            </div>
            {q.notes && <p className="mt-4 rounded-lg bg-mist p-3 text-sm whitespace-pre-line">{q.notes}</p>}
          </Card>
          <div className="space-y-6">
            <Card title="Client">
              <KeyValues
                className="sm:grid-cols-1"
                items={[
                  ["Client", customer ? <a key="c" href={`/admin/clients/${customer.id}`} className="text-gold hover:underline">{customer.companyName ?? customer.fullName}</a> : "—"],
                  ["E-mail", customer?.email ?? request?.email],
                  ["Validité", q.validUntil ? fdate(q.validUntil) : null],
                ]}
              />
            </Card>
            <Card title="Réponse du client">
              <p className="mb-3 text-sm text-muted-foreground">Le client peut répondre depuis son espace. Si la réponse arrive par téléphone ou e-mail, enregistrez-la ici.</p>
              <div className="flex flex-wrap gap-2">
                {q.status !== "accepte" && (
                  <ConfirmActionButton action={setQuoteStatus} fields={{ id: q.id, status: "accepte" }} confirm="Marquer ce devis comme accepté par le client ?" success="Devis marqué comme accepté.">
                    Accepté
                  </ConfirmActionButton>
                )}
                {q.status !== "refuse" && (
                  <ConfirmActionButton action={setQuoteStatus} fields={{ id: q.id, status: "refuse" }} confirm="Marquer ce devis comme refusé ?" variant="outline" success="Devis marqué comme refusé.">
                    Refusé
                  </ConfirmActionButton>
                )}
                {q.status === "envoye" && (
                  <ConfirmActionButton action={setQuoteStatus} fields={{ id: q.id, status: "expire" }} confirm="Marquer ce devis comme expiré ?" variant="outline" success="Devis marqué comme expiré.">
                    Expiré
                  </ConfirmActionButton>
                )}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <ConfirmActionButton action={duplicateQuote} fields={{ id: q.id }} confirm="Créer un nouveau brouillon à partir de ce devis ?" variant="ghost">
                  Dupliquer en nouveau brouillon
                </ConfirmActionButton>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
