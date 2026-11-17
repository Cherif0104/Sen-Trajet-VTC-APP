import { Download } from "lucide-react";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { myInvoices } from "@/server/queries/client";
import { INVOICE_STATUSES } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Mes factures" };

export default async function MyInvoicesPage() {
  const user = await requireRole("client");
  const rows = await myInvoices(user);
  return (
    <>
      <PageHeader title="Mes factures" description="Retrouvez vos factures et leur état de paiement." />
      <DataTable
        columns={[
          { key: "number", label: "Facture" },
          { key: "date", label: "Émise le" },
          { key: "due", label: "Échéance" },
          { key: "total", label: "Total TTC" },
          { key: "rest", label: "Reste à payer" },
          { key: "status", label: "Statut" },
          { key: "pdf", label: "", className: "text-right" },
        ]}
        rows={rows.map(({ invoice: inv }) => ({
          key: inv.id,
          cells: {
            number: <span className="font-mono text-xs font-medium">{inv.number}</span>,
            date: fdate(inv.issuedAt),
            due: fdate(inv.dueAt),
            total: fcfa(inv.total),
            rest: <span className="font-medium">{fcfa(Math.max(inv.total - inv.amountPaid, 0))}</span>,
            status: <StatusBadge list={INVOICE_STATUSES} value={inv.status} />,
            pdf: (
              <a href={`/api/pdf/facture/${inv.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:border-ink">
                <Download className="size-4" /> PDF
              </a>
            ),
          },
        }))}
        empty={<EmptyState title="Aucune facture" text="Vos factures apparaîtront ici dès leur émission." />}
      />
    </>
  );
}
