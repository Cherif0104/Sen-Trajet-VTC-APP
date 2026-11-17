import { asc, eq, sql } from "drizzle-orm";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Card, PageHeader } from "@/components/app/ui";
import { ActionForm, SubmitButton, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { deleteFeature, saveFeature } from "@/server/actions/admin-fleet";

export const metadata = { title: "Équipements" };

export default async function FeaturesPage() {
  await requirePermission("catalog.manage");
  const db = await getDb();
  const rows = await db
    .select({ f: schema.features, count: sql<number>`count(${schema.vehicleFeatures.vehicleId})::int` })
    .from(schema.features)
    .leftJoin(schema.vehicleFeatures, eq(schema.vehicleFeatures.featureId, schema.features.id))
    .groupBy(schema.features.id)
    .orderBy(asc(schema.features.sortOrder), asc(schema.features.name));

  return (
    <>
      <PageHeader title="Équipements" description="Options activables sur chaque fiche véhicule (climatisation, Wi-Fi, sièges enfant…)." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun équipement.</p>
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {rows.map(({ f, count }) => (
                <li key={f.id} className="py-3">
                  <ActionForm action={saveFeature} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input type="hidden" name="id" value={f.id} />
                    <TextField name="name" label={`Nom · ${count} véhicule(s)`} defaultValue={f.name} className="flex-1" />
                    <TextField name="sortOrder" type="number" label="Ordre" defaultValue={f.sortOrder} className="sm:w-24" />
                    <SubmitButton variant="outline">Enregistrer</SubmitButton>
                    <ConfirmActionButton action={deleteFeature} fields={{ id: f.id }} confirm={`Supprimer « ${f.name} » ? Il sera retiré de ${count} véhicule(s).`} variant="ghost" className="h-11 text-destructive">
                      Supprimer
                    </ConfirmActionButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Nouvel équipement" className="h-fit">
          <ActionForm action={saveFeature} className="space-y-4" resetOnSuccess>
            <TextField name="name" label="Nom" required placeholder="Ex. Prise USB-C" />
            <TextField name="sortOrder" type="number" label="Ordre" defaultValue={(rows.at(-1)?.f.sortOrder ?? 0) + 1} />
            <SubmitButton className="w-full">Ajouter</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
