import { desc } from "drizzle-orm";
import { Star } from "lucide-react";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { createTestimonial, setTestimonialStatus } from "@/server/actions/admin-content";
import { TESTIMONIAL_STATUSES } from "@/lib/domain";
import { fdate } from "@/lib/format";

export const metadata = { title: "Témoignages" };

export default async function TestimonialsPage() {
  await requirePermission("content.manage");
  const db = await getDb();
  const rows = await db.select().from(schema.testimonials).orderBy(desc(schema.testimonials.createdAt));
  return (
    <>
      <PageHeader title="Témoignages" description="Seuls les témoignages validés ici apparaissent sur le site." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <ul className="space-y-3">
          {rows.length === 0 && <li className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">Aucun témoignage reçu.</li>}
          {rows.map((t) => (
            <li key={t.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{t.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {[t.authorRole, t.company].filter(Boolean).join(" · ")}
                    {t.userId ? " · client inscrit" : " · saisi par l'équipe"} · {fdate(t.createdAt)}
                  </p>
                </div>
                <StatusBadge list={TESTIMONIAL_STATUSES} value={t.status} />
              </div>
              {t.rating && (
                <p className="mt-2 flex gap-0.5" aria-label={`${t.rating} sur 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`size-4 ${i < t.rating! ? "fill-gold text-gold" : "text-neutral-300"}`} />
                  ))}
                </p>
              )}
              <p className="mt-3 text-sm whitespace-pre-line">« {t.content} »</p>
              <div className="mt-4 flex gap-2">
                {t.status !== "publie" && (
                  <ConfirmActionButton action={setTestimonialStatus} fields={{ id: t.id, status: "publie" }} size="sm">
                    Publier
                  </ConfirmActionButton>
                )}
                {t.status !== "refuse" && (
                  <ConfirmActionButton action={setTestimonialStatus} fields={{ id: t.id, status: "refuse" }} size="sm" variant="outline">
                    {t.status === "publie" ? "Retirer" : "Refuser"}
                  </ConfirmActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Card title="Ajouter un témoignage reçu" className="h-fit">
          <ActionForm action={createTestimonial} className="space-y-4" resetOnSuccess>
            <TextField name="authorName" label="Nom de l'auteur" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="authorRole" label="Fonction" />
              <TextField name="company" label="Structure" />
            </div>
            <TextAreaField name="content" label="Témoignage" required rows={4} />
            <TextField name="rating" type="number" min={1} max={5} label="Note (1 à 5)" />
            <CheckboxField name="consent" label="L'auteur a donné son accord écrit pour la publication" />
            <SubmitButton className="w-full">Ajouter</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
