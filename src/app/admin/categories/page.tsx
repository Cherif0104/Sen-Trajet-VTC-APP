import Image from "next/image";
import { asc, eq, sql } from "drizzle-orm";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Badge, Card, PageHeader } from "@/components/app/ui";
import { FileInput } from "@/components/file-input";
import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { deleteCategory, saveCategory } from "@/server/actions/admin-fleet";

export const metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  await requirePermission("catalog.manage");
  const db = await getDb();
  const rows = await db
    .select({ c: schema.categories, count: sql<number>`count(${schema.vehicles.id})::int` })
    .from(schema.categories)
    .leftJoin(schema.vehicles, eq(schema.vehicles.categoryId, schema.categories.id))
    .groupBy(schema.categories.id)
    .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));

  return (
    <>
      <PageHeader title="Catégories de véhicules" description="Elles structurent le catalogue et les filtres du site." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ul className="space-y-3">
          {rows.map(({ c, count }) => (
            <li key={c.id}>
              <details className="group rounded-2xl border border-border bg-white">
                <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
                  <span className="relative block h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-mist">
                    {c.image && <Image src={c.image} alt="" fill sizes="64px" className="object-cover" unoptimized={c.image.startsWith("/api/")} />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {count} véhicule(s) · ordre {c.sortOrder}
                    </span>
                  </span>
                  {!c.isActive && <Badge>Masquée</Badge>}
                  <span className="text-sm text-gold group-open:hidden">Modifier</span>
                </summary>
                <div className="border-t border-border p-4">
                  <ActionForm action={saveCategory} className="space-y-4">
                    <input type="hidden" name="id" value={c.id} />
                    <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                      <TextField name="name" label="Nom" required defaultValue={c.name} />
                      <TextField name="sortOrder" type="number" label="Ordre" defaultValue={c.sortOrder} />
                    </div>
                    <TextAreaField name="description" label="Description" rows={2} defaultValue={c.description} />
                    <FileInput name="image" label="Remplacer l'image" accept="image/jpeg,image/png,image/webp" />
                    <CheckboxField name="isActive" label="Visible sur le site" defaultChecked={c.isActive} />
                    <div className="flex flex-wrap justify-between gap-2">
                      <ConfirmActionButton action={deleteCategory} fields={{ id: c.id }} confirm={`Supprimer la catégorie « ${c.name} » ?`} variant="ghost" className="text-destructive">
                        Supprimer
                      </ConfirmActionButton>
                      <SubmitButton>Enregistrer</SubmitButton>
                    </div>
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <Card title="Nouvelle catégorie" className="h-fit">
          <ActionForm action={saveCategory} className="space-y-4" resetOnSuccess>
            <TextField name="name" label="Nom" required placeholder="Ex. Véhicules électriques" />
            <TextAreaField name="description" label="Description" rows={2} />
            <TextField name="sortOrder" type="number" label="Ordre d'affichage" defaultValue={(rows.at(-1)?.c.sortOrder ?? 0) + 1} />
            <FileInput name="image" label="Image" accept="image/jpeg,image/png,image/webp" />
            <SubmitButton className="w-full">Créer la catégorie</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
