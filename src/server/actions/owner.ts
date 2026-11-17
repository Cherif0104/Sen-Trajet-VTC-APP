"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import { assertRole } from "../auth";
import { audit, nextReference, notifyStaff, queueEmail, adminEmails } from "../core";
import { emailLayout } from "../email";
import { storeFile, validateFile } from "../files";
import { getOwnerForUser, ownerSubmission } from "../queries/owner";
import { fail, zodErrors, type ActionState } from "@/lib/action-state";
import { DOC_TYPES, FUELS, TRANSMISSIONS } from "@/lib/domain";
import { SITE_URL } from "@/lib/site";

const optInt = (min: number, max: number, msg: string) =>
  z.coerce.number().int().min(min, msg).max(max, msg).optional().or(z.literal("").transform(() => undefined));

const submissionSchema = z.object({
  brand: z.string().trim().min(2, "Indiquez la marque").max(60),
  model: z.string().trim().min(1, "Indiquez le modèle").max(80),
  year: optInt(1990, new Date().getFullYear() + 1, "Année invalide"),
  plate: z.string().trim().max(20).optional(),
  mileage: optInt(0, 2_000_000, "Kilométrage invalide"),
  fuel: z.enum(FUELS.map((f) => f.value) as [string, ...string[]]).optional().or(z.literal("").transform(() => undefined)),
  transmission: z.enum(TRANSMISSIONS.map((f) => f.value) as [string, ...string[]]).optional().or(z.literal("").transform(() => undefined)),
  seats: optInt(1, 80, "Nombre de places invalide"),
  condition: z.string().trim().min(5, "Décrivez l'état du véhicule").max(1500),
  availability: z.string().trim().max(500).optional(),
  ownerConditions: z.string().trim().max(1500).optional(),
});

export async function createSubmission(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertRole("proprietaire");
  const owner = await getOwnerForUser(user.id);
  if (!owner) return { ok: false, message: "Profil propriétaire introuvable. Contactez l'équipe." };
  const parsed = submissionSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return fail(fd, "Certains champs sont à corriger.", zodErrors(parsed.error));
  const photos = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 8);
  for (const p of photos) {
    const err = validateFile(p, { imagesOnly: true });
    if (err) return fail(fd, err, { photos: err });
  }
  const d = parsed.data;
  const db = await getDb();
  const sub = await db.transaction(async (tx) => {
    const reference = await nextReference(tx, "submission");
    const [s] = await tx
      .insert(schema.ownerSubmissions)
      .values({
        reference,
        ownerId: owner.id,
        brand: d.brand,
        model: d.model,
        year: d.year ?? null,
        plate: d.plate || null,
        mileage: d.mileage ?? null,
        fuel: d.fuel ?? null,
        transmission: d.transmission ?? null,
        seats: d.seats ?? null,
        condition: d.condition,
        availability: d.availability || null,
        ownerConditions: d.ownerConditions || null,
        status: "soumis",
      })
      .returning({ id: schema.ownerSubmissions.id, reference: schema.ownerSubmissions.reference });
    for (const p of photos) {
      const fileId = await storeFile(tx, p, { entityType: "owner_submission", entityId: s.id, uploadedBy: user.id });
      await tx.insert(schema.documents).values({ fileId, entityType: "owner_submission", entityId: s.id, docType: "photo", uploadedBy: user.id });
    }
    await tx.insert(schema.submissionHistory).values({ submissionId: s.id, toStatus: "soumis", note: "Soumission en ligne", byUserId: user.id });
    if (owner.status === "prospect") {
      await tx.update(schema.owners).set({ status: "en_revue", updatedAt: new Date() }).where(eq(schema.owners.id, owner.id));
    }
    await notifyStaff(tx, "owners.manage", `Nouveau véhicule proposé ${reference}`, `${owner.fullName} — ${d.brand} ${d.model}`, `/admin/proprietaires/soumissions/${s.id}`);
    return s;
  });
  await audit(user.id, "submission.create", "owner_submission", sub.id, { reference: sub.reference });
  const admins = await adminEmails();
  if (admins.length)
    await queueEmail(
      admins.join(","),
      `Nouveau véhicule proposé en partenariat ${sub.reference}`,
      emailLayout("Nouvelle soumission propriétaire", [`${owner.fullName} propose un ${d.brand} ${d.model}.`], { label: "Examiner", url: `${SITE_URL}/admin/proprietaires/soumissions/${sub.id}` }),
    ).catch(() => {});
  await queueEmail(
    user.email,
    `SENTRAJET PREMIUM — soumission ${sub.reference} reçue`,
    emailLayout("Votre véhicule a bien été soumis", [
      `Bonjour ${user.fullName},`,
      `Nous avons bien reçu la proposition de votre ${d.brand} ${d.model} (référence ${sub.reference}).`,
      "Ajoutez la carte grise, l'attestation d'assurance et la visite technique depuis votre espace pour accélérer l'étude du dossier.",
    ], { label: "Compléter mon dossier", url: `${SITE_URL}/proprietaire/vehicules/${sub.id}` }),
  ).catch(() => {});
  redirect(`/proprietaire/vehicules/${sub.id}?nouveau=1`);
}

export async function uploadSubmissionDocument(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertRole("proprietaire");
  const owner = await getOwnerForUser(user.id);
  const submissionId = String(fd.get("submissionId") ?? "");
  if (!owner) return { ok: false, message: "Profil propriétaire introuvable." };
  const sub = await ownerSubmission(owner.id, submissionId);
  if (!sub) return { ok: false, message: "Dossier introuvable." };
  if (sub.status === "refuse") return { ok: false, message: "Ce dossier est clôturé." };
  const docType = String(fd.get("docType") ?? "");
  if (!DOC_TYPES.some((d) => d.value === docType)) return { ok: false, message: "Type de document invalide." };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choisissez un fichier." };
  const err = validateFile(file);
  if (err) return { ok: false, message: err };
  const expiresRaw = String(fd.get("expiresAt") ?? "");
  const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(expiresRaw) ? expiresRaw : null;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const fileId = await storeFile(tx, file, { entityType: "owner_submission", entityId: sub.id, uploadedBy: user.id });
    await tx.insert(schema.documents).values({ fileId, entityType: "owner_submission", entityId: sub.id, docType, expiresAt, uploadedBy: user.id });
    await notifyStaff(tx, "owners.manage", `Nouveau document ${sub.reference}`, `${owner.fullName} a ajouté un document`, `/admin/proprietaires/soumissions/${sub.id}`);
  });
  await audit(user.id, "submission.document_upload", "owner_submission", sub.id, { docType });
  revalidatePath(`/proprietaire/vehicules/${sub.id}`);
  return { ok: true, message: "Document ajouté. Il sera vérifié par notre équipe." };
}
