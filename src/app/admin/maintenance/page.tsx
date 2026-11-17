import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Card, EmptyState, FilterBar, FilterSelect, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { qOf, vehicleOptions } from "@/server/queries/admin";
import { deleteMaintenance, saveMaintenance } from "@/server/actions/admin-fleet";
import { MAINTENANCE_STATUSES, MAINTENANCE_TYPES, maintenanceTypeLabel } from "@/lib/domain";
import { fcfa, fdate, num } from "@/lib/format";

export const metadata = { title: "Maintenance" };

type Row = typeof schema.maintenance.$inferSelect;

function MaintenanceFields({ m, vehicles, vehicleId }: { m?: Row; vehicles: { value: string; label: string }[]; vehicleId?: string }) {
  return (
    <>
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="vehicleId" label="Véhicule" required options={vehicles} placeholder="Choisir" defaultValue={m?.vehicleId ?? vehicleId ?? ""} />
        <SelectField name="type" label="Type d'intervention" options={MAINTENANCE_TYPES} defaultValue={m?.type ?? "vidange"} />
        <TextField name="scheduledDate" type="date" label="Date prévue" defaultValue={m?.scheduledDate} />
        <TextField name="dueMileage" type="number" label="Ou kilométrage d'échéance" defaultValue={m?.dueMileage} />
        <SelectField name="status" label="Statut" options={MAINTENANCE_STATUSES} defaultValue={m?.status ?? "planifie"} />
        <TextField name="completedDate" type="date" label="Réalisée le" defaultValue={m?.completedDate} />
        <TextField name="cost" type="number" label="Coût TTC (FCFA)" defaultValue={m?.cost} />
        <TextField name="provider" label="Prestataire / garage" defaultValue={m?.provider} />
      </div>
      <TextAreaField name="notes" label="Notes" rows={2} defaultValue={m?.notes} />
      <CheckboxField name="updateVehicleStatus" label="Mettre à jour l'état technique du véhicule (en cours → en maintenance, terminé → opérationnel)" defaultChecked />
    </>
  );
}

export default async function MaintenancePage({ searchParams }: PageProps<"/admin/maintenance">) {
  await requirePermission("maintenance.manage");
  const sp = await searchParams;
  const vehicule = qOf(sp, "vehicule");
  const status = qOf(sp, "status");
  const db = await getDb();
  const conds: SQL[] = [];
  if (vehicule) conds.push(eq(schema.maintenance.vehicleId, vehicule));
  if (status) conds.push(eq(schema.maintenance.status, status));
  const [rows, vehicles] = await Promise.all([
    db
      .select({ m: schema.maintenance, brand: schema.vehicles.brand, model: schema.vehicles.model, plate: schema.vehicles.plate, mileage: schema.vehicles.mileage })
      .from(schema.maintenance)
      .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.maintenance.vehicleId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(schema.maintenance.status), desc(schema.maintenance.scheduledDate))
      .limit(300),
    vehicleOptions(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const open = (s: string) => s === "planifie" || s === "en_cours";

  return (
    <>
      <PageHeader title="Maintenance & rappels" description="Entretiens, visites techniques, assurances. Les échéances à 15 jours apparaissent sur le tableau de bord." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <FilterBar action="/admin/maintenance" placeholder="">
            <FilterSelect name="vehicule" value={vehicule} options={vehicles} placeholder="Tous les véhicules" />
            <FilterSelect name="status" value={status} options={MAINTENANCE_STATUSES} placeholder="Tous les statuts" />
          </FilterBar>
          {rows.length === 0 ? (
            <EmptyState title="Aucune intervention" text="Planifiez les entretiens pour recevoir des rappels." />
          ) : (
            <ul className="space-y-3">
              {rows.map(({ m, brand, model, plate, mileage }) => {
                const late = open(m.status) && ((m.scheduledDate && m.scheduledDate < today) || (m.dueMileage && mileage && mileage >= m.dueMileage));
                const close = open(m.status) && !late && m.scheduledDate && m.scheduledDate <= soon;
                return (
                  <li key={m.id}>
                    <details className="rounded-2xl border border-border bg-white">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
                        <span className="flex-1">
                          <span className="block font-medium">
                            {maintenanceTypeLabel(m.type)} — {brand} {model}
                            {plate ? ` (${plate})` : ""}
                          </span>
                          <span className={`text-xs ${late ? "font-semibold text-red-600" : close ? "text-amber-700" : "text-muted-foreground"}`}>
                            {late ? "En retard · " : close ? "Bientôt · " : ""}
                            {m.scheduledDate ? `Prévu le ${fdate(m.scheduledDate)}` : ""}
                            {m.dueMileage ? ` · à ${num(m.dueMileage)} km` : ""}
                            {m.cost ? ` · ${fcfa(m.cost)}` : ""}
                          </span>
                        </span>
                        <StatusBadge list={MAINTENANCE_STATUSES} value={m.status} />
                      </summary>
                      <div className="border-t border-border p-4">
                        <ActionForm action={saveMaintenance} className="space-y-4">
                          <MaintenanceFields m={m} vehicles={vehicles} />
                          <div className="flex justify-between gap-2">
                            <ConfirmActionButton action={deleteMaintenance} fields={{ id: m.id }} confirm="Supprimer cette intervention ?" variant="ghost" className="text-destructive">
                              Supprimer
                            </ConfirmActionButton>
                            <SubmitButton>Enregistrer</SubmitButton>
                          </div>
                        </ActionForm>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Card title="Planifier une intervention" className="h-fit">
          <ActionForm action={saveMaintenance} className="space-y-4" resetOnSuccess>
            <MaintenanceFields vehicles={vehicles} vehicleId={vehicule} />
            <SubmitButton className="w-full">Enregistrer</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
