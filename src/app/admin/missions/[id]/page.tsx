import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { MissionForm } from "@/components/app/mission-form";
import { Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { customerOptions, driverOptions, vehicleOptions } from "@/server/queries/admin";
import { MISSION_STATUSES } from "@/lib/domain";

export default async function MissionDetail({ params }: PageProps<"/admin/missions/[id]">) {
  await requirePermission("missions.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [m] = await db.select().from(schema.missions).where(eq(schema.missions.id, id)).limit(1);
  if (!m) notFound();
  const [customers, vehicles, drivers, r] = await Promise.all([
    customerOptions(),
    vehicleOptions(true),
    driverOptions(),
    m.requestId ? db.select({ id: schema.requests.id, reference: schema.requests.reference }).from(schema.requests).where(eq(schema.requests.id, m.requestId)).then((x) => x[0]) : undefined,
  ]);
  const km = m.mileageStart !== null && m.mileageEnd !== null ? m.mileageEnd - m.mileageStart : null;
  return (
    <>
      <PageHeader
        back={{ href: "/admin/missions", label: "Missions" }}
        title={`Mission ${m.reference}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge list={MISSION_STATUSES} value={m.status} />
            {r && (
              <a href={`/admin/demandes/${r.id}`} className="text-gold hover:underline">
                Demande {r.reference}
              </a>
            )}
            {km !== null && <span>· {km} km parcourus</span>}
          </span>
        }
      />
      <Card>
        <MissionForm mission={m} options={{ customers, vehicles, drivers }} />
      </Card>
    </>
  );
}
