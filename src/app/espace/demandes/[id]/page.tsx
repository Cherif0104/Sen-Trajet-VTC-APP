import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Card, KeyValues, PageHeader, StatusBadge, Timeline } from "@/components/app/ui";
import { QuoteActions } from "@/components/app/quote-actions";
import { requireRole } from "@/server/auth";
import { myRequest } from "@/server/queries/client";
import { accountTypeLabel, INVOICE_STATUSES, QUOTE_STATUSES, REQUEST_STATUSES, requestStatusLabel, serviceLabel } from "@/lib/domain";
import { fcfa, fdate, fdatetime } from "@/lib/format";

export const metadata = { title: "Détail de la demande" };

export default async function MyRequestDetail({ params }: PageProps<"/espace/demandes/[id]">) {
  const { id } = await params;
  const user = await requireRole("client");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await myRequest(user, id);
  if (!data) notFound();
  const r = data.request;

  return (
    <>
      <PageHeader
        back={{ href: "/espace/demandes", label: "Mes demandes" }}
        title={`${r.kind === "devis" ? "Demande de devis" : "Demande de réservation"} ${r.reference}`}
        description={<StatusBadge list={REQUEST_STATUSES} value={r.status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Votre demande">
            <KeyValues
              items={[
                ["Prestation", serviceLabel(r.serviceType)],
                ["Véhicule", data.vehicle ? `${data.vehicle.brand} ${data.vehicle.model}` : "Sans préférence"],
                ["Catégorie", data.category?.name],
                ["Chauffeur", r.withDriver ? "Avec chauffeur" : "Sans chauffeur"],
                ["Début", r.startDate ? `${fdate(r.startDate)}${r.startTime ? ` à ${r.startTime}` : ""}` : "À préciser"],
                ["Fin", r.endDate ? `${fdate(r.endDate)}${r.endTime ? ` à ${r.endTime}` : ""}` : null],
                ["Prise en charge", r.pickup],
                ["Destination", r.destination],
                ["Passagers", r.passengers ? String(r.passengers) : null],
                ["Durée", r.duration],
                ["Compte", accountTypeLabel(r.accountType)],
                ["Structure", r.companyName],
                ["Envoyée le", fdatetime(r.createdAt)],
              ]}
            />
            {r.details && <p className="mt-4 rounded-lg bg-mist p-3 text-sm whitespace-pre-line">{r.details}</p>}
          </Card>

          <Card title="Devis">
            {data.quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun devis pour le moment. Vous serez notifié dès qu&apos;un devis vous sera adressé.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.quotes.map((q) => (
                  <li key={q.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {q.number} · {fcfa(q.total)} TTC
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Valable jusqu&apos;au {fdate(q.validUntil)} · <StatusBadge list={QUOTE_STATUSES} value={q.status} />
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={`/api/pdf/devis/${q.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:border-ink">
                        <Download className="size-4" /> PDF
                      </a>
                      {q.status === "envoye" && <QuoteActions quoteId={q.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {data.invoices.length > 0 && (
            <Card title="Factures">
              <ul className="divide-y divide-border">
                {data.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium">
                        {inv.number} · {fcfa(inv.total)} TTC
                      </p>
                      <StatusBadge list={INVOICE_STATUSES} value={inv.status} />
                    </div>
                    <a href={`/api/pdf/facture/${inv.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:border-ink">
                      <Download className="size-4" /> PDF
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <Card title="Suivi">
          <Timeline
            items={data.history.map((h) => ({
              id: h.id,
              title: requestStatusLabel(h.toStatus),
              meta: fdatetime(h.createdAt),
              note: h.note,
            }))}
          />
        </Card>
      </div>
    </>
  );
}
