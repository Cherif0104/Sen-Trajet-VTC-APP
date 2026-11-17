import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { OwnerForm } from "@/components/app/owner-form";
import { Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { CONTRACT_STATUSES, PUBLICATION_STATUSES, SUBMISSION_STATUSES, paymentMethodLabel } from "@/lib/domain";
import { fcfa, fdate } from "@/lib/format";
import { can } from "@/lib/permissions";

export default async function OwnerDetail({ params }: PageProps<"/admin/proprietaires/[id]">) {
  const user = await requirePermission("owners.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [o] = await db.select().from(schema.owners).where(eq(schema.owners.id, id)).limit(1);
  if (!o) notFound();
  const [subs, vehicles, contracts, payments] = await Promise.all([
    db.select().from(schema.ownerSubmissions).where(eq(schema.ownerSubmissions.ownerId, id)).orderBy(desc(schema.ownerSubmissions.createdAt)),
    db.select().from(schema.vehicles).where(eq(schema.vehicles.ownerId, id)),
    db.select().from(schema.contracts).where(eq(schema.contracts.ownerId, id)).orderBy(desc(schema.contracts.createdAt)),
    db.select().from(schema.payments).where(eq(schema.payments.ownerId, id)).orderBy(desc(schema.payments.paidAt)).limit(30),
  ]);
  const paid = payments.filter((p) => p.direction === "decaissement").reduce((s, p) => s + p.amount, 0);
  return (
    <>
      <PageHeader back={{ href: "/admin/proprietaires", label: "Propriétaires" }} title={o.fullName} description={o.userId ? "Compte espace propriétaire actif" : "Pas de compte espace propriétaire"} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Fiche">
          <OwnerForm owner={o} />
        </Card>
        <div className="space-y-6">
          <Card title="Véhicules proposés">
            {subs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune proposition.</p>
            ) : (
              <ul className="-my-2 divide-y divide-border text-sm">
                {subs.map((s) => (
                  <li key={s.id}>
                    <a href={`/admin/proprietaires/soumissions/${s.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:text-gold">
                      <span>
                        {s.brand} {s.model} <span className="font-mono text-xs text-muted-foreground">{s.reference}</span>
                      </span>
                      <StatusBadge list={SUBMISSION_STATUSES} value={s.status} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Véhicules en flotte">
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun véhicule intégré.</p>
            ) : (
              <ul className="-my-2 divide-y divide-border text-sm">
                {vehicles.map((v) => (
                  <li key={v.id}>
                    <a href={`/admin/vehicules/${v.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:text-gold">
                      {v.brand} {v.model} <StatusBadge list={PUBLICATION_STATUSES} value={v.publicationStatus} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Contrats" actions={can(user.role, "contracts.manage") && <a href={`/admin/contrats/nouveau?proprietaire=${o.id}`} className="text-sm text-gold hover:underline">Nouveau contrat</a>}>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun contrat.</p>
            ) : (
              <ul className="-my-2 divide-y divide-border text-sm">
                {contracts.map((c) => (
                  <li key={c.id}>
                    <a href={`/admin/contrats/${c.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:text-gold">
                      {c.number} · {c.title} <StatusBadge list={CONTRACT_STATUSES} value={c.status} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={`Reversements (${fcfa(paid)})`} actions={can(user.role, "finance.manage") && <a href={`/admin/finances?proprietaire=${o.id}#reversement`} className="text-sm text-gold hover:underline">Enregistrer</a>}>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun reversement enregistré.</p>
            ) : (
              <ul className="-my-2 divide-y divide-border text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <span>
                      {fdate(p.paidAt)} · {paymentMethodLabel(p.method)}
                    </span>
                    <span className="font-medium">{fcfa(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
