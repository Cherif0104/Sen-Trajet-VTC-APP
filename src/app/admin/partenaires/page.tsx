import Image from "next/image";
import { asc } from "drizzle-orm";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Badge, Card, PageHeader } from "@/components/app/ui";
import { FileInput } from "@/components/file-input";
import { ActionForm, CheckboxField, SubmitButton, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { deletePartner, savePartner } from "@/server/actions/admin-content";

export const metadata = { title: "Partenaires" };

type Partner = typeof schema.partners.$inferSelect;

function PartnerFields({ p }: { p?: Partner }) {
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Nom" required defaultValue={p?.name} />
        <TextField name="sector" label="Secteur" defaultValue={p?.sector} />
        <TextField name="website" label="Site web" placeholder="https://" defaultValue={p?.website} />
        <TextField name="sortOrder" type="number" label="Ordre" defaultValue={p?.sortOrder ?? 0} />
      </div>
      <FileInput name="logo" label={p?.logoUrl ? "Remplacer le logo" : "Logo"} accept="image/png,image/webp,image/jpeg" />
      <CheckboxField name="authorizationConfirmed" label="Autorisation écrite obtenue pour afficher le nom et le logo" defaultChecked={p?.authorizationConfirmed} />
      <CheckboxField name="isPublished" label="Afficher sur la page Partenaires" hint="Impossible sans autorisation." defaultChecked={p?.isPublished} />
    </>
  );
}

export default async function PartnersPage() {
  await requirePermission("content.manage");
  const db = await getDb();
  const rows = await db.select().from(schema.partners).orderBy(asc(schema.partners.sortOrder), asc(schema.partners.name));
  return (
    <>
      <PageHeader title="Partenaires" description="La page publique « Partenaires » n'affiche que les partenaires autorisés et publiés." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {rows.length === 0 && <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">Aucun partenaire enregistré.</p>}
          {rows.map((p) => (
            <details key={p.id} className="rounded-2xl border border-border bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
                <span className="relative flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-mist">
                  {p.logoUrl ? <Image src={p.logoUrl} alt="" fill sizes="80px" className="object-contain p-1" unoptimized /> : <span className="text-xs text-muted-foreground">Logo</span>}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.sector}</span>
                </span>
                {p.isPublished ? <Badge tone="success">Publié</Badge> : <Badge>Masqué</Badge>}
                {!p.authorizationConfirmed && <Badge tone="warning">Sans autorisation</Badge>}
              </summary>
              <div className="border-t border-border p-4">
                <ActionForm action={savePartner} className="space-y-4">
                  <PartnerFields p={p} />
                  <div className="flex justify-between">
                    <ConfirmActionButton action={deletePartner} fields={{ id: p.id }} confirm={`Supprimer « ${p.name} » ?`} variant="ghost" className="text-destructive">
                      Supprimer
                    </ConfirmActionButton>
                    <SubmitButton>Enregistrer</SubmitButton>
                  </div>
                </ActionForm>
              </div>
            </details>
          ))}
        </div>
        <Card title="Ajouter un partenaire" className="h-fit">
          <ActionForm action={savePartner} className="space-y-4" resetOnSuccess>
            <PartnerFields />
            <SubmitButton className="w-full">Ajouter</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
