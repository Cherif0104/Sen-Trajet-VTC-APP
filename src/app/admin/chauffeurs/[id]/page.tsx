import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { DriverForm } from "@/components/app/driver-form";
import { Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { MISSION_STATUSES } from "@/lib/domain";
import { fdatetime } from "@/lib/format";

export default async function DriverDetail({ params }: PageProps<"/admin/chauffeurs/[id]">) {
  await requirePermission("drivers.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [d] = await db.select().from(schema.drivers).where(eq(schema.drivers.id, id)).limit(1);
  if (!d) notFound();
  const missions = await db.select().from(schema.missions).where(eq(schema.missions.driverId, id)).orderBy(desc(schema.missions.startAt)).limit(30);
  return (
    <>
      <PageHeader back={{ href: "/admin/chauffeurs", label: "Chauffeurs" }} title={d.fullName} description={d.userId ? "Compte espace chauffeur rattaché" : "Aucun compte espace chauffeur rattaché"} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <DriverForm driver={d} />
        </Card>
        <Card title="Missions">
          {missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune mission affectée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {missions.map((m) => (
                <li key={m.id}>
                  <a href={`/admin/missions/${m.id}`} className="flex items-center justify-between gap-2 hover:text-gold">
                    <span>
                      {fdatetime(m.startAt)}
                      <span className="block text-xs text-muted-foreground">{[m.pickup, m.destination].filter(Boolean).join(" → ")}</span>
                    </span>
                    <StatusBadge list={MISSION_STATUSES} value={m.status} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
