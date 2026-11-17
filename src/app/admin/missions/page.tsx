import { and, asc, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { DataTable, EmptyState, FilterBar, FilterSelect, PageHeader, StatusBadge } from "@/components/app/ui";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { qOf } from "@/server/queries/admin";
import { MISSION_STATUSES } from "@/lib/domain";
import { fdatetime } from "@/lib/format";

export const metadata = { title: "Missions" };

const WHEN = [
  { value: "avenir", label: "À venir" },
  { value: "passees", label: "Passées" },
];

export default async function AdminMissions({ searchParams }: PageProps<"/admin/missions">) {
  await requirePermission("missions.manage");
  const sp = await searchParams;
  const status = qOf(sp, "status");
  const when = qOf(sp, "when") || "avenir";
  const db = await getDb();
  const conds: SQL[] = [];
  if (status) conds.push(eq(schema.missions.status, status));
  const now = new Date(Date.now() - 12 * 3600000);
  conds.push(when === "passees" ? lt(schema.missions.startAt, now) : gte(schema.missions.startAt, now));
  const rows = await db
    .select({
      m: schema.missions,
      driver: schema.drivers.fullName,
      brand: schema.vehicles.brand,
      model: schema.vehicles.model,
      customer: schema.customers.fullName,
      company: schema.customers.companyName,
    })
    .from(schema.missions)
    .leftJoin(schema.drivers, eq(schema.drivers.id, schema.missions.driverId))
    .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.missions.vehicleId))
    .leftJoin(schema.customers, eq(schema.customers.id, schema.missions.customerId))
    .where(and(...conds))
    .orderBy(when === "passees" ? desc(schema.missions.startAt) : asc(schema.missions.startAt))
    .limit(200);

  return (
    <>
      <PageHeader title="Missions" description="Planning des prestations, affectation des véhicules et chauffeurs." actions={<ButtonLink href="/admin/missions/nouvelle">Nouvelle mission</ButtonLink>} />
      <FilterBar action="/admin/missions" placeholder="">
        <FilterSelect name="when" value={when} options={WHEN} placeholder="Toutes" />
        <FilterSelect name="status" value={status} options={MISSION_STATUSES} placeholder="Tous les statuts" />
      </FilterBar>
      <DataTable
        columns={[
          { key: "d", label: "Date" },
          { key: "c", label: "Client" },
          { key: "i", label: "Itinéraire" },
          { key: "v", label: "Véhicule" },
          { key: "dr", label: "Chauffeur" },
          { key: "s", label: "Statut" },
        ]}
        rows={rows.map(({ m, driver, brand, model, customer, company }) => ({
          key: m.id,
          href: `/admin/missions/${m.id}`,
          cells: {
            d: (
              <span>
                {fdatetime(m.startAt)}
                <span className="block font-mono text-xs text-muted-foreground">{m.reference}</span>
              </span>
            ),
            c: company ?? customer ?? "—",
            i: [m.pickup, m.destination].filter(Boolean).join(" → ") || "—",
            v: brand ? `${brand} ${model}` : <span className="text-amber-700">À affecter</span>,
            dr: driver ?? <span className="text-amber-700">À affecter</span>,
            s: <StatusBadge list={MISSION_STATUSES} value={m.status} />,
          },
        }))}
        empty={<EmptyState title="Aucune mission" text="Planifiez une mission depuis une demande confirmée ou directement." />}
      />
    </>
  );
}
