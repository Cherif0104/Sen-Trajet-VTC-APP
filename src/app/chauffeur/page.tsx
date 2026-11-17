import { desc, eq, sql } from "drizzle-orm";
import { MapPin } from "lucide-react";
import { MissionStepForm } from "@/components/app/mission-step-form";
import { EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { MISSION_STATUSES } from "@/lib/domain";
import { fdatetime } from "@/lib/format";

export default async function DriverHome() {
  const user = await requireRole("chauffeur");
  const db = await getDb();
  const [driver] = await db.select().from(schema.drivers).where(eq(schema.drivers.userId, user.id)).limit(1);
  if (!driver)
    return (
      <EmptyState title="Profil chauffeur en cours de création" text="L'équipe SENTRAJET PREMIUM doit rattacher votre compte à votre fiche chauffeur. Contactez votre responsable." />
    );
  const missions = await db
    .select({
      m: schema.missions,
      vehicle: sql<string | null>`${schema.vehicles.brand} || ' ' || ${schema.vehicles.model}`,
      plate: schema.vehicles.plate,
    })
    .from(schema.missions)
    .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.missions.vehicleId))
    .where(eq(schema.missions.driverId, driver.id))
    .orderBy(desc(schema.missions.startAt))
    .limit(100);
  const active = missions.filter((x) => ["planifiee", "en_cours"].includes(x.m.status)).reverse();
  const past = missions.filter((x) => !["planifiee", "en_cours"].includes(x.m.status));

  return (
    <>
      <PageHeader title={`Bonjour ${user.fullName.split(" ")[0]}`} description="Vos missions planifiées et votre historique." />
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Missions à venir et en cours</h2>
        {active.length === 0 ? (
          <EmptyState title="Aucune mission planifiée" text="Vos prochaines missions apparaîtront ici dès leur planification." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {active.map(({ m, vehicle, plate }) => (
              <li key={m.id} className="space-y-3 rounded-2xl border border-border bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="whitespace-nowrap font-mono text-xs text-muted-foreground">{m.reference}</p>
                    <p className="font-semibold">{fdatetime(m.startAt)}</p>
                  </div>
                  <StatusBadge list={MISSION_STATUSES} value={m.status} />
                </div>
                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                  {[m.pickup, m.destination].filter(Boolean).join(" → ") || "Itinéraire communiqué par l'équipe"}
                </p>
                {vehicle && (
                  <p className="text-sm text-muted-foreground">
                    {vehicle}
                    {plate ? ` · ${plate}` : ""}
                  </p>
                )}
                {m.notes && <p className="rounded-lg bg-mist p-3 text-sm">{m.notes}</p>}
                <MissionStepForm missionId={m.id} step={m.status === "planifiee" ? "start" : "finish"} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold">Historique</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
            {past.map(({ m, vehicle }) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span>
                  <span className="font-medium">{fdatetime(m.startAt)}</span> · {[m.pickup, m.destination].filter(Boolean).join(" → ")}
                  {vehicle && <span className="text-muted-foreground"> · {vehicle}</span>}
                </span>
                <StatusBadge list={MISSION_STATUSES} value={m.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
