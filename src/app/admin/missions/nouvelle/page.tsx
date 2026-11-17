import { eq } from "drizzle-orm";
import { MissionForm } from "@/components/app/mission-form";
import { Card, PageHeader } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { customerOptions, driverOptions, vehicleOptions } from "@/server/queries/admin";

export const metadata = { title: "Nouvelle mission" };

export default async function NewMission({ searchParams }: PageProps<"/admin/missions/nouvelle">) {
  await requirePermission("missions.manage");
  const sp = await searchParams;
  const requestId = typeof sp.demande === "string" && /^[0-9a-f-]{36}$/.test(sp.demande) ? sp.demande : undefined;
  const db = await getDb();
  const [customers, vehicles, drivers, r] = await Promise.all([
    customerOptions(),
    vehicleOptions(),
    driverOptions(),
    requestId ? db.select().from(schema.requests).where(eq(schema.requests.id, requestId)).then((x) => x[0]) : undefined,
  ]);
  const dt = (d: string | null, t: string | null) => (d ? `${d}T${t && /^\d{2}:\d{2}$/.test(t) ? t : "08:00"}` : undefined);
  return (
    <>
      <PageHeader back={r ? { href: `/admin/demandes/${r.id}`, label: `Demande ${r.reference}` } : { href: "/admin/missions", label: "Missions" }} title="Nouvelle mission" />
      <Card>
        <MissionForm
          options={{ customers, vehicles, drivers }}
          defaults={
            r
              ? {
                  requestId: r.id,
                  customerId: r.customerId ?? undefined,
                  vehicleId: r.vehicleId ?? undefined,
                  startAt: dt(r.startDate, r.startTime),
                  endAt: dt(r.endDate, r.endTime),
                  pickup: r.pickup ?? undefined,
                  destination: r.destination ?? undefined,
                  notes: r.passengers ? `${r.passengers} passager(s).` : undefined,
                }
              : {}
          }
        />
      </Card>
    </>
  );
}
