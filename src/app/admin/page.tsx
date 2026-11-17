import Link from "next/link";
import { AlertTriangle, CalendarClock, CarFront, ClipboardList, Inbox, Receipt, Wallet, Wrench } from "lucide-react";
import { MonthlyBars } from "@/components/app/charts";
import { Card, EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { dashboardData } from "@/server/queries/admin";
import { docTypeLabel, maintenanceTypeLabel, REQUEST_STATUSES, serviceLabel } from "@/lib/domain";
import { fcfa, fdate, fdatetime } from "@/lib/format";
import { can } from "@/lib/permissions";

export const metadata = { title: "Tableau de bord" };

export default async function AdminDashboard() {
  const user = await requirePermission("dashboard.view");
  const d = await dashboardData();
  const show = (p: Parameters<typeof can>[1]) => can(user.role, p);

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.fullName.split(" ")[0]}`}
        description="Vue d'ensemble de l'activité SENTRAJET PREMIUM."
        actions={show("requests.manage") && <ButtonLink href="/admin/demandes?status=nouvelle">Traiter les nouvelles demandes</ButtonLink>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {show("requests.manage") && (
          <>
            <StatCard label="Nouvelles demandes" value={d.kpi.newRequests} href="/admin/demandes?status=nouvelle" icon={<ClipboardList className="size-4 text-gold" />} />
            <StatCard label="Demandes en cours de traitement" value={d.kpi.openRequests} href="/admin/demandes" icon={<Inbox className="size-4 text-gold" />} />
          </>
        )}
        {show("missions.manage") && <StatCard label="Missions planifiées à venir" value={d.kpi.upcomingMissions} href="/admin/missions" icon={<CalendarClock className="size-4 text-gold" />} />}
        {show("vehicles.manage") && (
          <StatCard
            label="Véhicules opérationnels"
            value={d.kpi.vehiclesOps}
            hint={d.kpi.vehiclesMaint ? `${d.kpi.vehiclesMaint} en maintenance, à inspecter ou immobilisé(s)` : undefined}
            href="/admin/vehicules"
            icon={<CarFront className="size-4 text-gold" />}
          />
        )}
        {show("finance.manage") && <StatCard label="Encaissé ce mois-ci" value={fcfa(d.kpi.monthIn)} href="/admin/finances" icon={<Wallet className="size-4 text-gold" />} />}
        {show("invoices.manage") && (
          <StatCard label="Reste à encaisser" value={fcfa(d.kpi.unpaidAmount)} hint={`${d.kpi.unpaidCount} facture(s) ouverte(s)`} href="/admin/factures?status=emise" icon={<Receipt className="size-4 text-gold" />} />
        )}
        {show("owners.manage") && <StatCard label="Soumissions propriétaires à traiter" value={d.kpi.pendingSubs} href="/admin/proprietaires/soumissions" icon={<CarFront className="size-4 text-gold" />} />}
        {show("messages.manage") && <StatCard label="Messages non lus" value={d.kpi.unreadMsgs} href="/admin/messages" icon={<Inbox className="size-4 text-gold" />} />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {show("requests.manage") && (
          <Card title="Demandes reçues (6 derniers mois)">
            <MonthlyBars
              data={d.requestsByMonth}
              series={[
                { key: "reservations", label: "Réservations", color: "#C99A32" },
                { key: "devis", label: "Demandes de devis", color: "#252525" },
              ]}
            />
          </Card>
        )}
        {show("finance.manage") && (
          <Card title="Encaissements et sorties (FCFA)">
            <MonthlyBars
              money
              data={d.financeByMonth}
              series={[
                { key: "encaissements", label: "Encaissements", color: "#C99A32" },
                { key: "sorties", label: "Dépenses et reversements", color: "#252525" },
              ]}
            />
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {show("requests.manage") && (
          <Card title="Dernières demandes" className="xl:col-span-2" actions={<Link href="/admin/demandes" className="text-sm text-gold hover:underline">Tout voir</Link>}>
            {d.latest.length === 0 ? (
              <EmptyState title="Aucune demande pour le moment" text="Les demandes envoyées depuis le site apparaîtront ici." />
            ) : (
              <ul className="-my-2 divide-y divide-border">
                {d.latest.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/demandes/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-gold">
                      <span className="min-w-0">
                        <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
                        <span className="block truncate text-sm font-medium">
                          {r.companyName ? `${r.companyName} · ` : ""}
                          {r.contactName} — {serviceLabel(r.serviceType)}
                        </span>
                      </span>
                      <span className="flex items-center gap-3 text-xs text-muted-foreground">
                        {fdatetime(r.createdAt)}
                        <StatusBadge list={REQUEST_STATUSES} value={r.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {show("missions.manage") && (
          <Card title="Prochaines missions">
            {d.nextMissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune mission planifiée.</p>
            ) : (
              <ul className="space-y-3">
                {d.nextMissions.map((m) => (
                  <li key={m.id}>
                    <Link href={`/admin/missions/${m.id}`} className="block rounded-lg border border-border p-3 hover:border-gold">
                      <p className="text-sm font-semibold">{fdatetime(m.startAt)}</p>
                      <p className="truncate text-xs text-muted-foreground">{[m.pickup, m.destination].filter(Boolean).join(" → ") || m.reference}</p>
                      <p className="text-xs">{m.driver ?? "Chauffeur à affecter"}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {(show("maintenance.manage") || show("owners.manage")) && (
        <Card title="Rappels (échéances sous 15 jours ou dépassées)" className="mt-6">
          {d.maint.length === 0 && d.docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune échéance proche.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {d.maint.map((m) => (
                <li key={m.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <Wrench className="mt-0.5 size-4 shrink-0 text-gold" />
                  <Link href="/admin/maintenance" className="text-sm hover:text-gold">
                    <span className="font-medium">{maintenanceTypeLabel(m.type)}</span> — {m.brand} {m.model}
                    {m.plate ? ` (${m.plate})` : ""}
                    <span className={`block text-xs ${m.scheduledDate && m.scheduledDate < d.today ? "text-red-600" : "text-muted-foreground"}`}>
                      {m.scheduledDate && m.scheduledDate < d.today ? "En retard depuis le " : "Prévu le "}
                      {fdate(m.scheduledDate)}
                    </span>
                  </Link>
                </li>
              ))}
              {d.docs.map((doc) => (
                <li key={doc.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span className="text-sm">
                    <span className="font-medium">{docTypeLabel(doc.docType)}</span> arrive à expiration
                    <span className={`block text-xs ${doc.expiresAt && doc.expiresAt < d.today ? "text-red-600" : "text-muted-foreground"}`}>
                      {doc.expiresAt && doc.expiresAt < d.today ? "Expiré le " : "Expire le "}
                      {fdate(doc.expiresAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
