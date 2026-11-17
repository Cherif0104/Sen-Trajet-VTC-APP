import { notFound } from "next/navigation";
import { CheckCircle2, Circle, FileText } from "lucide-react";
import { DocumentUploadForm } from "@/components/app/document-upload-form";
import { Card, KeyValues, PageHeader, StatusBadge, Timeline } from "@/components/app/ui";
import { requireRole } from "@/server/auth";
import { getOwnerForUser, ownerSubmission } from "@/server/queries/owner";
import { DOC_STATUSES, docTypeLabel, FUELS, optLabel, SUBMISSION_STATUSES, submissionStatusLabel, TRANSMISSIONS } from "@/lib/domain";
import { fdate, fdatetime, num } from "@/lib/format";

export const metadata = { title: "Dossier véhicule" };

const REQUIRED = ["carte_grise", "assurance", "visite_technique"];

export default async function OwnerSubmissionPage({ params, searchParams }: PageProps<"/proprietaire/vehicules/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireRole("proprietaire");
  const owner = await getOwnerForUser(user.id);
  if (!owner || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await ownerSubmission(owner.id, id);
  if (!s) notFound();
  const photos = s.documents.filter((d) => d.docType === "photo");
  const docs = s.documents.filter((d) => d.docType !== "photo");
  const missing = REQUIRED.filter((t) => !docs.some((d) => d.docType === t));
  const showProposal = s.proposal && ["proposition", "contrat", "integre", "suivi"].includes(s.status);

  return (
    <>
      <PageHeader
        back={{ href: "/proprietaire/vehicules", label: "Mes véhicules" }}
        title={`${s.brand} ${s.model}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{s.reference}</span> <StatusBadge list={SUBMISSION_STATUSES} value={s.status} />
          </span>
        }
      />
      {sp.nouveau && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Votre véhicule a bien été soumis. Ajoutez maintenant ses documents pour permettre l&apos;étude du dossier.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {showProposal && (
            <Card title="Proposition de SENTRAJET PREMIUM" className="border-gold/50">
              <p className="text-sm whitespace-pre-line">{s.proposal}</p>
              <p className="mt-3 text-xs text-muted-foreground">Cette proposition n&apos;engage les parties qu&apos;après signature du contrat.</p>
            </Card>
          )}
          <Card title="Documents du véhicule">
            <ul className="mb-5 grid gap-2 sm:grid-cols-3">
              {REQUIRED.map((t) => {
                const ok = !missing.includes(t);
                return (
                  <li key={t} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${ok ? "border-emerald-200 bg-emerald-50" : "border-border"}`}>
                    {ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4 text-muted-foreground" />}
                    {docTypeLabel(t)}
                  </li>
                );
              })}
            </ul>
            {docs.length > 0 && (
              <ul className="mb-5 divide-y divide-border rounded-xl border border-border">
                {docs.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <a href={`/api/files/${d.fileId}`} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 hover:text-gold">
                      <FileText className="size-4 shrink-0 text-gold" />
                      <span className="truncate">
                        {docTypeLabel(d.docType)} <span className="text-muted-foreground">· {d.fileName}</span>
                      </span>
                    </a>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {d.expiresAt && <>Expire le {fdate(d.expiresAt)}</>}
                      <StatusBadge list={DOC_STATUSES} value={d.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {s.status !== "refuse" && <DocumentUploadForm submissionId={s.id} defaultType={missing[0] ?? "autre"} />}
          </Card>
          {photos.length > 0 && (
            <Card title="Photos">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((p) => (
                  <a key={p.id} href={`/api/files/${p.fileId}`} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] overflow-hidden rounded-lg bg-mist">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/files/${p.fileId}`} alt={p.fileName} className="h-full w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            </Card>
          )}
          <Card title="Informations déclarées">
            <KeyValues
              items={[
                ["Année", s.year ? String(s.year) : null],
                ["Immatriculation", s.plate],
                ["Kilométrage", s.mileage ? `${num(s.mileage)} km` : null],
                ["Places", s.seats ? String(s.seats) : null],
                ["Carburant", optLabel(FUELS, s.fuel)],
                ["Boîte", optLabel(TRANSMISSIONS, s.transmission)],
                ["Inspection prévue", s.inspectionDate ? fdate(s.inspectionDate) : null],
              ]}
            />
            <div className="mt-4 space-y-3 text-sm">
              {s.condition && (
                <p>
                  <span className="font-medium">État : </span>
                  {s.condition}
                </p>
              )}
              {s.availability && (
                <p>
                  <span className="font-medium">Disponibilités : </span>
                  {s.availability}
                </p>
              )}
              {s.ownerConditions && (
                <p>
                  <span className="font-medium">Vos conditions : </span>
                  {s.ownerConditions}
                </p>
              )}
            </div>
          </Card>
        </div>
        <Card title="Avancement">
          <Timeline items={s.history.map((h) => ({ id: h.id, title: submissionStatusLabel(h.toStatus), meta: fdatetime(h.createdAt), note: h.note }))} />
        </Card>
      </div>
    </>
  );
}
