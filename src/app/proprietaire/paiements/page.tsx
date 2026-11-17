import { DataTable, EmptyState, PageHeader, StatCard } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { getOwnerForUser, ownerPayments } from "@/server/queries/owner";
import { paymentMethodLabel } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

export const metadata = { title: "Mes paiements" };

export default async function OwnerPaymentsPage() {
  const user = await requireRole("proprietaire");
  const owner = await getOwnerForUser(user.id);
  if (!owner) return <EmptyState title="Profil propriétaire introuvable" />;
  const rows = await ownerPayments(owner.id);
  const total = rows.reduce((s, r) => s + r.payment.amount, 0);
  const year = new Date().getFullYear();
  const thisYear = rows.filter((r) => r.payment.paidAt.startsWith(String(year))).reduce((s, r) => s + r.payment.amount, 0);
  return (
    <>
      <PageHeader title="Mes paiements" description="Reversements enregistrés par SENTRAJET PREMIUM selon vos contrats." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total reçu" value={fcfa(total)} />
        <StatCard label={`Reçu en ${year}`} value={fcfa(thisYear)} />
      </div>
      <DataTable
        columns={[
          { key: "date", label: "Date" },
          { key: "amount", label: "Montant" },
          { key: "method", label: "Moyen" },
          { key: "contract", label: "Contrat" },
          { key: "ref", label: "Référence" },
        ]}
        rows={rows.map(({ payment: p, contractNumber }) => ({
          key: p.id,
          cells: {
            date: fdate(p.paidAt),
            amount: <span className="font-semibold">{fcfa(p.amount)}</span>,
            method: paymentMethodLabel(p.method),
            contract: contractNumber ? <span className="whitespace-nowrap font-mono text-xs">{contractNumber}</span> : "—",
            ref: p.reference ?? "—",
          },
        }))}
        empty={<EmptyState title="Aucun paiement" text="Les reversements apparaîtront ici dès qu'ils seront enregistrés par notre équipe." />}
      />
    </>
  );
}
