import Link from "next/link";
import { CarFront, FileSignature, Wallet, ClipboardList } from "lucide-react";
import { Card, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requireRole } from "@/server/auth";
import { getOwnerForUser, ownerContracts, ownerPayments, ownerSubmissionsList, ownerVehicles } from "@/server/queries/owner";
import { SUBMISSION_STATUSES } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";

const STEPS = ["soumis", "en_revue", "inspection", "proposition", "contrat", "integre", "suivi"];

export default async function OwnerDashboard() {
  const user = await requireRole("proprietaire");
  const owner = await getOwnerForUser(user.id);
  if (!owner) return <EmptyState title="Profil propriétaire introuvable" text="Contactez l'équipe SENTRAJET PREMIUM." />;
  const [subs, contracts, payments, vehicles] = await Promise.all([
    ownerSubmissionsList(owner.id),
    ownerContracts(owner.id),
    ownerPayments(owner.id),
    ownerVehicles(owner.id),
  ]);
  const totalPaid = payments.reduce((s, p) => s + p.payment.amount, 0);
  const active = subs.filter((s) => !["refuse"].includes(s.status));

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.fullName.split(" ")[0]}`}
        description="Suivez vos véhicules proposés, vos contrats et vos paiements."
        actions={
          <ButtonLink href="/proprietaire/vehicules/nouveau" className="h-10 px-4">
            Proposer un véhicule
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard label="Dossiers en cours" value={active.length} href="/proprietaire/vehicules" icon={<ClipboardList className="size-4 text-gold" />} />
        <StatCard label="Véhicules intégrés" value={vehicles.length} href="/proprietaire/vehicules" icon={<CarFront className="size-4 text-gold" />} />
        <StatCard label="Contrats" value={contracts.length} href="/proprietaire/contrats" icon={<FileSignature className="size-4 text-gold" />} />
        <StatCard label="Paiements reçus" value={fcfa(totalPaid)} href="/proprietaire/paiements" icon={<Wallet className="size-4 text-gold" />} />
      </div>

      <div className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold">Mes dossiers</h2>
        {subs.length === 0 ? (
          <EmptyState
            title="Aucun véhicule proposé"
            text="Décrivez votre véhicule et ajoutez ses documents : notre équipe étudiera votre dossier."
            action={
              <ButtonLink href="/proprietaire/vehicules/nouveau" className="mt-2 h-10">
                Proposer mon véhicule
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {subs.slice(0, 4).map((s) => {
              const idx = STEPS.indexOf(s.status);
              return (
                <Link key={s.id} href={`/proprietaire/vehicules/${s.id}`} className="block rounded-2xl border border-border bg-white p-5 hover:border-gold/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {s.brand} {s.model} {s.year ? `(${s.year})` : ""}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{s.reference}</p>
                    </div>
                    <StatusBadge list={SUBMISSION_STATUSES} value={s.status} />
                  </div>
                  {s.status !== "refuse" && (
                    <div className="mt-4 flex gap-1" aria-label="Avancement du dossier">
                      {STEPS.map((st, i) => (
                        <span key={st} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-gold" : "bg-mist"}`} />
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">Soumis le {fdate(s.createdAt)}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Card className="mt-6" title="Bon à savoir">
        <p className="text-sm text-muted-foreground">
          Les contrats et paiements apparaissent dans votre espace après validation par l&apos;équipe SENTRAJET PREMIUM. Aucun revenu n&apos;est
          garanti avant la signature d&apos;un contrat.
        </p>
      </Card>
    </>
  );
}
