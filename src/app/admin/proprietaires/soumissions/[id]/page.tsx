import Image from "next/image";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { Card, KeyValues, PageHeader, StatusBadge, Timeline } from "@/components/app/ui";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { ButtonLink } from "@/components/ui/button-link";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { integrateSubmission, setDocumentStatus, updateSubmission } from "@/server/actions/admin-crm";
import { DOC_STATUSES, docTypeLabel, optLabel, FUELS, SUBMISSION_STATUSES, submissionStatusLabel, TRANSMISSIONS } from "@/lib/domain";
import { fdate, fdatetime, num } from "@/lib/format";
import { can } from "@/lib/permissions";

export default async function SubmissionDetail({ params }: PageProps<"/admin/proprietaires/soumissions/[id]">) {
  const user = await requirePermission("owners.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [s] = await db.select().from(schema.ownerSubmissions).where(eq(schema.ownerSubmissions.id, id)).limit(1);
  if (!s) notFound();
  const [owner, docs, history] = await Promise.all([
    db.select().from(schema.owners).where(eq(schema.owners.id, s.ownerId)).then((r) => r[0]),
    db
      .select({ d: schema.documents, mime: schema.files.mime, name: schema.files.name })
      .from(schema.documents)
      .innerJoin(schema.files, eq(schema.files.id, schema.documents.fileId))
      .where(and(eq(schema.documents.entityType, "owner_submission"), eq(schema.documents.entityId, id)))
      .orderBy(desc(schema.documents.createdAt)),
    db
      .select({ h: schema.submissionHistory, by: schema.users.fullName })
      .from(schema.submissionHistory)
      .leftJoin(schema.users, eq(schema.users.id, schema.submissionHistory.byUserId))
      .where(eq(schema.submissionHistory.submissionId, id))
      .orderBy(desc(schema.submissionHistory.createdAt)),
  ]);
  const photos = docs.filter((x) => x.d.docType === "photo" && x.mime.startsWith("image/"));
  const papers = docs.filter((x) => !(x.d.docType === "photo" && x.mime.startsWith("image/")));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/proprietaires/soumissions", label: "Véhicules proposés" }}
        title={`${s.brand} ${s.model}${s.year ? ` ${s.year}` : ""}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{s.reference}</span>
            <StatusBadge list={SUBMISSION_STATUSES} value={s.status} />
          </span>
        }
        actions={
          <>
            {s.vehicleId ? (
              <ButtonLink href={`/admin/vehicules/${s.vehicleId}`}>Voir la fiche flotte</ButtonLink>
            ) : (
              ["proposition", "contrat"].includes(s.status) && (
                <ConfirmActionButton action={integrateSubmission} fields={{ id: s.id }} confirm="Créer la fiche véhicule (en brouillon, non publiée) à partir de cette proposition ?">
                  Intégrer à la flotte
                </ConfirmActionButton>
              )
            )}
            {can(user.role, "contracts.manage") && (
              <ButtonLink href={`/admin/contrats/nouveau?proprietaire=${s.ownerId}`} variant="outline">
                Préparer un contrat
              </ButtonLink>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Véhicule déclaré">
            <KeyValues
              items={[
                ["Immatriculation", s.plate],
                ["Kilométrage", s.mileage ? `${num(s.mileage)} km` : null],
                ["Carburant", optLabel(FUELS, s.fuel)],
                ["Boîte", optLabel(TRANSMISSIONS, s.transmission)],
                ["Places", s.seats],
                ["État déclaré", s.condition],
                ["Disponibilité", s.availability],
                ["Conditions du propriétaire", s.ownerConditions],
              ]}
            />
          </Card>
          <Card title={`Photos (${photos.length})`}>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune photo.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map(({ d }) => (
                  <li key={d.id}>
                    <a href={`/api/files/${d.fileId}`} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-mist">
                      <Image src={`/api/files/${d.fileId}`} alt="Photo du véhicule" fill sizes="240px" className="object-cover" unoptimized />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Documents">
            {papers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun document transmis pour l'instant (carte grise, assurance, visite technique…).</p>
            ) : (
              <ul className="space-y-3">
                {papers.map(({ d, name }) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                    <FileText className="size-5 text-gold" />
                    <span className="min-w-0 flex-1">
                      <a href={`/api/files/${d.fileId}`} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:text-gold">
                        {docTypeLabel(d.docType)}
                      </a>
                      <span className={`text-xs ${d.expiresAt && d.expiresAt < today ? "text-red-600" : "text-muted-foreground"}`}>
                        {name}
                        {d.expiresAt ? ` · expire le ${fdate(d.expiresAt)}` : ""}
                      </span>
                    </span>
                    <StatusBadge list={DOC_STATUSES} value={d.status} />
                    <span className="flex gap-1">
                      {d.status !== "valide" && (
                        <ConfirmActionButton action={setDocumentStatus} fields={{ id: d.id, status: "valide" }} size="sm" variant="outline">
                          Valider
                        </ConfirmActionButton>
                      )}
                      {d.status !== "refuse" && (
                        <ConfirmActionButton action={setDocumentStatus} fields={{ id: d.id, status: "refuse" }} size="sm" variant="ghost" className="text-destructive">
                          Refuser
                        </ConfirmActionButton>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Propriétaire">
            {owner && (
              <KeyValues
                className="sm:grid-cols-1"
                items={[
                  ["Nom", <a key="o" href={`/admin/proprietaires/${owner.id}`} className="text-gold hover:underline">{owner.fullName}</a>],
                  ["Téléphone", owner.phone],
                  ["E-mail", owner.email],
                ]}
              />
            )}
          </Card>
          <Card title="Faire avancer le dossier">
            <ActionForm action={updateSubmission} className="space-y-4">
              <input type="hidden" name="id" value={s.id} />
              <SelectField name="status" label="Étape" options={SUBMISSION_STATUSES} defaultValue={s.status} />
              <TextField name="inspectionDate" type="date" label="Date d'inspection" defaultValue={s.inspectionDate} />
              <TextAreaField
                name="proposal"
                label="Proposition au propriétaire (visible dans son espace)"
                rows={4}
                defaultValue={s.proposal}
                hint="Décrivez les conditions envisagées. Aucun revenu ne doit être garanti avant signature du contrat."
              />
              <TextAreaField name="adminNotes" label="Notes internes" rows={3} defaultValue={s.adminNotes} />
              <TextAreaField name="note" label="Message joint à cette étape" rows={2} />
              <CheckboxField name="notifyOwner" label="Informer le propriétaire (e-mail et espace)" defaultChecked />
              <SubmitButton className="w-full">Enregistrer</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Historique">
            <Timeline
              items={history.map(({ h, by }) => ({
                id: h.id,
                title: submissionStatusLabel(h.toStatus),
                meta: `${fdatetime(h.createdAt)}${by ? ` · ${by}` : " · Propriétaire"}`,
                note: h.note,
              }))}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
