"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { assertRole } from "../auth";
import { audit, notifyStaff } from "../core";

export async function driverUpdateMission(fd: FormData): Promise<{ ok: boolean; message?: string }> {
  const user = await assertRole("chauffeur");
  const db = await getDb();
  const [driver] = await db.select({ id: schema.drivers.id }).from(schema.drivers).where(eq(schema.drivers.userId, user.id)).limit(1);
  if (!driver) return { ok: false, message: "Profil chauffeur introuvable." };
  const missionId = String(fd.get("missionId") ?? "");
  const step = String(fd.get("step") ?? "");
  const km = Number(fd.get("mileage") ?? "") || null;
  const [m] = await db
    .select()
    .from(schema.missions)
    .where(and(eq(schema.missions.id, missionId), eq(schema.missions.driverId, driver.id)))
    .limit(1);
  if (!m) return { ok: false, message: "Mission introuvable." };
  if (step === "start" && m.status === "planifiee") {
    await db.update(schema.missions).set({ status: "en_cours", mileageStart: km ?? m.mileageStart, updatedAt: new Date() }).where(eq(schema.missions.id, m.id));
  } else if (step === "finish" && m.status === "en_cours") {
    if (km && m.mileageStart && km < m.mileageStart) return { ok: false, message: "Le kilométrage d'arrivée est inférieur au départ." };
    await db.update(schema.missions).set({ status: "terminee", mileageEnd: km ?? m.mileageEnd, updatedAt: new Date() }).where(eq(schema.missions.id, m.id));
  } else {
    return { ok: false, message: "Action impossible pour cette mission." };
  }
  await notifyStaff(db, "missions.manage", `Mission ${m.reference} ${step === "start" ? "démarrée" : "terminée"}`, user.fullName, `/admin/missions/${m.id}`);
  await audit(user.id, `mission.driver_${step}`, "mission", m.id);
  revalidatePath("/chauffeur");
  return { ok: true };
}
