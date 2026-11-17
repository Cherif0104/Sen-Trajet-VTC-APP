import { DataTable, EmptyState, StatusBadge } from "./ui";
import { ButtonLink } from "@/components/ui/button-link";
import { REQUEST_STATUSES, serviceLabel } from "@/lib/domain";
import { fdate } from "@/lib/format";

type Row = {
  id: string;
  reference: string;
  kind: string;
  serviceType: string;
  status: string;
  startDate: string | null;
  pickup: string | null;
  destination: string | null;
  vehicleName: string | null;
  categoryName: string | null;
};

export function ClientRequestList({ rows, emptyTitle, emptyText }: { rows: Row[]; emptyTitle: string; emptyText?: string }) {
  return (
    <DataTable
      columns={[
        { key: "ref", label: "Référence" },
        { key: "service", label: "Prestation" },
        { key: "date", label: "Date" },
        { key: "trajet", label: "Trajet", className: "hidden md:table-cell" },
        { key: "status", label: "Statut" },
      ]}
      rows={rows.map((r) => ({
        key: r.id,
        href: `/espace/demandes/${r.id}`,
        cells: {
          ref: (
            <span>
              <span className="font-mono text-xs">{r.reference}</span>
              <span className="block text-xs font-normal text-muted-foreground">{r.kind === "devis" ? "Devis" : "Réservation"}</span>
            </span>
          ),
          service: (
            <span>
              {serviceLabel(r.serviceType)}
              {(r.vehicleName || r.categoryName) && <span className="block text-xs text-muted-foreground">{r.vehicleName ?? r.categoryName}</span>}
            </span>
          ),
          date: fdate(r.startDate),
          trajet: <span className="text-xs">{[r.pickup, r.destination].filter(Boolean).join(" → ") || "—"}</span>,
          status: <StatusBadge list={REQUEST_STATUSES} value={r.status} />,
        },
      }))}
      empty={
        <EmptyState
          title={emptyTitle}
          text={emptyText}
          action={
            <ButtonLink href="/espace/nouvelle-demande" className="mt-2 h-10">
              Nouvelle demande
            </ButtonLink>
          }
        />
      }
    />
  );
}
