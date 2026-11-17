import { FileText } from "lucide-react";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { getOwnerForUser, ownerContracts } from "@/server/queries/owner";
import { CONTRACT_STATUSES } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Mes contrats" };

export default async function OwnerContractsPage() {
  const user = await requireRole("proprietaire");
  const owner = await getOwnerForUser(user.id);
  if (!owner) return <EmptyState title="Profil propriétaire introuvable" />;
  const rows = await ownerContracts(owner.id);
  return (
    <>
      <PageHeader title="Mes contrats" description="Contrats de partenariat validés et partagés par SENTRAJET PREMIUM." />
      <DataTable
        columns={[
          { key: "number", label: "Contrat" },
          { key: "vehicle", label: "Véhicule" },
          { key: "period", label: "Période" },
          { key: "amount", label: "Montant" },
          { key: "status", label: "Statut" },
          { key: "file", label: "", className: "text-right" },
        ]}
        rows={rows.map(({ contract: c, vehicleName }) => ({
          key: c.id,
          cells: {
            number: (
              <span>
                <span className="font-mono text-xs">{c.number}</span>
                <span className="block text-xs text-muted-foreground">{c.title}</span>
              </span>
            ),
            vehicle: vehicleName ?? "—",
            period: `${fdate(c.startDate)} → ${fdate(c.endDate)}`,
            amount: c.amount ? fcfa(c.amount) : "—",
            status: <StatusBadge list={CONTRACT_STATUSES} value={c.status} />,
            file: c.fileId ? (
              <a href={`/api/files/${c.fileId}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:border-ink">
                <FileText className="size-4" /> Document
              </a>
            ) : null,
          },
        }))}
        empty={<EmptyState title="Aucun contrat partagé" text="Vos contrats apparaîtront ici après signature et validation par notre équipe." />}
      />
      {rows.some((r) => r.contract.terms) && (
        <div className="mt-6 space-y-4">
          {rows
            .filter((r) => r.contract.terms)
            .map(({ contract: c }) => (
              <details key={c.id} className="rounded-2xl border border-border bg-white p-5">
                <summary className="cursor-pointer text-sm font-semibold">Conditions — {c.number}</summary>
                <p className="mt-3 text-sm whitespace-pre-line text-graphite/85">{c.terms}</p>
              </details>
            ))}
        </div>
      )}
    </>
  );
}
