import { asc } from "drizzle-orm";
import { VehicleForm } from "@/components/app/vehicle-form";
import { PageHeader } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { ownerOptions } from "@/server/queries/admin";

export const metadata = { title: "Nouveau véhicule" };

export default async function NewVehicle() {
  await requirePermission("vehicles.manage");
  const db = await getDb();
  const [categories, features, owners] = await Promise.all([
    db.select({ value: schema.categories.id, label: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
    db.select({ value: schema.features.id, label: schema.features.name }).from(schema.features).orderBy(asc(schema.features.sortOrder)),
    ownerOptions(),
  ]);
  return (
    <>
      <PageHeader back={{ href: "/admin/vehicules", label: "Véhicules" }} title="Nouveau véhicule" description="Le véhicule reste en brouillon tant que vous ne le publiez pas." />
      <VehicleForm categories={categories} features={features} owners={owners} />
    </>
  );
}
