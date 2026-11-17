import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requireRole } from "@/server/auth";
import { getOwnerForUser, ownerSubmissionsList, ownerVehicles } from "@/server/queries/owner";
import { COMMERCIAL_STATUSES, SUBMISSION_STATUSES, TECHNICAL_STATUSES } from "@/lib/domain";
import { fdate } from "@/lib/format";

export const metadata = { title: "Mes véhicules" };

export default async function OwnerVehiclesPage() {
  const user = await requireRole("proprietaire");
  const owner = await getOwnerForUser(user.id);
  if (!owner) return <EmptyState title="Profil propriétaire introuvable" />;
  const [subs, vehicles] = await Promise.all([ownerSubmissionsList(owner.id), ownerVehicles(owner.id)]);
  return (
    <>
      <PageHeader
        title="Mes véhicules"
        description="Dossiers de partenariat et véhicules intégrés à la flotte."
        actions={
          <ButtonLink href="/proprietaire/vehicules/nouveau" className="h-10 px-4">
            Proposer un véhicule
          </ButtonLink>
        }
      />
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Dossiers soumis</h2>
          <DataTable
            columns={[
              { key: "vehicle", label: "Véhicule" },
              { key: "ref", label: "Référence" },
              { key: "date", label: "Soumis le" },
              { key: "status", label: "Statut" },
            ]}
            rows={subs.map((s) => ({
              key: s.id,
              href: `/proprietaire/vehicules/${s.id}`,
              cells: {
                vehicle: `${s.brand} ${s.model}${s.year ? ` (${s.year})` : ""}`,
                ref: <span className="whitespace-nowrap font-mono text-xs">{s.reference}</span>,
                date: fdate(s.createdAt),
                status: <StatusBadge list={SUBMISSION_STATUSES} value={s.status} />,
              },
            }))}
            empty={<EmptyState title="Aucun dossier" text="Proposez votre premier véhicule pour démarrer un partenariat." />}
          />
        </section>
        {vehicles.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Véhicules en exploitation</h2>
            <DataTable
              columns={[
                { key: "vehicle", label: "Véhicule" },
                { key: "plate", label: "Immatriculation" },
                { key: "commercial", label: "Statut commercial" },
                { key: "technical", label: "État technique" },
              ]}
              rows={vehicles.map((v) => ({
                key: v.id,
                cells: {
                  vehicle: `${v.brand} ${v.model}`,
                  plate: v.plate ?? "—",
                  commercial: <StatusBadge list={COMMERCIAL_STATUSES} value={v.commercialStatus} />,
                  technical: <StatusBadge list={TECHNICAL_STATUSES} value={v.technicalStatus} />,
                },
              }))}
            />
          </section>
        )}
      </div>
    </>
  );
}
