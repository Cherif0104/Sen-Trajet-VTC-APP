import Link from "next/link";
import { Download } from "lucide-react";
import { QuoteActions } from "@/components/app/quote-actions";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { myQuotes } from "@/server/queries/client";
import { QUOTE_STATUSES } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Mes devis" };

export default async function MyQuotesPage() {
  const user = await requireRole("client");
  const rows = await myQuotes(user);
  return (
    <>
      <PageHeader title="Mes devis" description="Consultez, téléchargez et validez les devis qui vous sont adressés." />
      <DataTable
        columns={[
          { key: "number", label: "Devis" },
          { key: "ref", label: "Demande" },
          { key: "total", label: "Montant TTC" },
          { key: "valid", label: "Validité" },
          { key: "status", label: "Statut" },
          { key: "actions", label: "", className: "text-right" },
        ]}
        rows={rows.map(({ quote: q, reference }) => ({
          key: q.id,
          cells: {
            number: <span className="font-mono text-xs font-medium">{q.number}</span>,
            ref: q.requestId ? (
              <Link href={`/espace/demandes/${q.requestId}`} className="font-mono text-xs hover:text-gold">
                {reference}
              </Link>
            ) : (
              "—"
            ),
            total: <span className="font-medium">{fcfa(q.total)}</span>,
            valid: fdate(q.validUntil),
            status: <StatusBadge list={QUOTE_STATUSES} value={q.status} />,
            actions: (
              <div className="flex justify-end gap-2">
                <a href={`/api/pdf/devis/${q.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:border-ink">
                  <Download className="size-4" /> PDF
                </a>
                {q.status === "envoye" && <QuoteActions quoteId={q.id} />}
              </div>
            ),
          },
        }))}
        empty={<EmptyState title="Aucun devis" text="Les devis préparés par notre équipe apparaîtront ici." />}
      />
    </>
  );
}
