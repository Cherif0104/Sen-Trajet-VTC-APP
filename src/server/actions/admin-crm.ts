"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, notifyUser, queueEmail } from "../core";
import { emailLayout } from "../email";
import { adminAction, buttonAction, dateOrNull, oneOf, req, str, UserError } from "../admin/util";
import { ACCOUNT_TYPES, DOC_STATUSES, MESSAGE_STATUSES, OWNER_STATUSES, SUBMISSION_STATUSES, submissionStatusLabel } from "@/lib/domain";
import { slugify } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

const emailOk = (e: string | null) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/* ───────── Clients ───────── */

export const saveCustomer = adminAction("customers.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const email = str(fd, "email")?.toLowerCase() ?? null;
  if (!emailOk(email)) throw new UserError("E-mail invalide.", { cause: "email" });
  const type = oneOf(fd, "type", ACCOUNT_TYPES, "particulier");
  const companyName = str(fd, "companyName");
  if (type !== "particulier" && !companyName) throw new UserError("Le nom de la structure est obligatoire.", { cause: "companyName" });
  const data = {
    type,
    fullName: req(fd, "fullName", "Le nom du contact"),
    companyName,
    email,
    phone: str(fd, "phone"),
    city: str(fd, "city"),
    address: str(fd, "address"),
    notes: str(fd, "notes"),
    updatedAt: new Date(),
  };
  if (id) {
    await db.update(schema.customers).set(data).where(eq(schema.customers.id, id));
    await audit(user.id, "customer.update", "customer", id);
    revalidatePath(`/admin/clients/${id}`);
    return { ok: true, message: "Fiche client enregistrée." };
  }
  if (email) {
    const [dup] = await db.select({ id: schema.customers.id }).from(schema.customers).where(eq(schema.customers.email, email)).limit(1);
    if (dup) throw new UserError("Un client existe déjà avec cet e-mail.", { cause: "email" });
  }
  const [row] = await db.insert(schema.customers).values({ ...data, source: "back_office" }).returning({ id: schema.customers.id });
  await audit(user.id, "customer.create", "customer", row.id);
  return { ok: true, message: "Client créé.", redirectTo: `/admin/clients/${row.id}` };
});

/* ───────── Messages ───────── */

export const setMessageStatus = buttonAction("messages.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!MESSAGE_STATUSES.some((s) => s.value === status)) throw new UserError("Statut invalide.");
  await db.update(schema.messages).set({ status }).where(eq(schema.messages.id, id));
  await audit(user.id, "message.status", "message", id, { status });
  revalidatePath("/admin/messages");
  return { ok: true };
});

/* ───────── Propriétaires ───────── */

export const saveOwner = adminAction("owners.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const email = str(fd, "email")?.toLowerCase() ?? null;
  if (!emailOk(email)) throw new UserError("E-mail invalide.", { cause: "email" });
  const data = {
    fullName: req(fd, "fullName", "Le nom"),
    email,
    phone: str(fd, "phone"),
    companyName: str(fd, "companyName"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    status: oneOf(fd, "status", OWNER_STATUSES, "prospect"),
    payoutDetails: str(fd, "payoutDetails"),
    notes: str(fd, "notes"),
    updatedAt: new Date(),
  };
  if (id) {
    await db.update(schema.owners).set(data).where(eq(schema.owners.id, id));
    await audit(user.id, "owner.update", "owner", id);
    revalidatePath(`/admin/proprietaires/${id}`);
    return { ok: true, message: "Fiche propriétaire enregistrée." };
  }
  let userId: string | null = null;
  if (email) {
    const [u] = await db.select({ id: schema.users.id, role: schema.users.role }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (u?.role === "proprietaire") userId = u.id;
  }
  const [row] = await db.insert(schema.owners).values({ ...data, userId }).returning({ id: schema.owners.id });
  await audit(user.id, "owner.create", "owner", row.id);
  return { ok: true, message: "Propriétaire créé.", redirectTo: `/admin/proprietaires/${row.id}` };
});

export const updateSubmission = adminAction("owners.manage", async (user, fd) => {
  const db = await getDb();
  const id = req(fd, "id", "La soumission");
  const status = oneOf(fd, "status", SUBMISSION_STATUSES);
  const note = str(fd, "note");
  const notifyOwner = fd.get("notifyOwner") === "on";
  const [s] = await db.select().from(schema.ownerSubmissions).where(eq(schema.ownerSubmissions.id, id)).limit(1);
  if (!s) throw new UserError("Soumission introuvable.");
  const inspectionDate = dateOrNull(fd, "inspectionDate");
  if (status === "inspection" && !inspectionDate) throw new UserError("Indiquez la date d'inspection.", { cause: "inspectionDate" });
  const proposal = str(fd, "proposal");
  if (status === "proposition" && !proposal) throw new UserError("Rédigez la proposition envoyée au propriétaire.", { cause: "proposal" });
  const [owner] = await db.select().from(schema.owners).where(eq(schema.owners.id, s.ownerId));
  await db.transaction(async (tx) => {
    await tx
      .update(schema.ownerSubmissions)
      .set({ status, inspectionDate, proposal, adminNotes: str(fd, "adminNotes"), updatedAt: new Date() })
      .where(eq(schema.ownerSubmissions.id, id));
    if (status !== s.status || note) await tx.insert(schema.submissionHistory).values({ submissionId: id, fromStatus: s.status, toStatus: status, note, byUserId: user.id });
    if (owner && ["en_revue", "inspection", "proposition"].includes(status) && owner.status === "prospect")
      await tx.update(schema.owners).set({ status: "en_revue" }).where(eq(schema.owners.id, owner.id));
    if (owner && ["contrat", "integre", "suivi"].includes(status) && owner.status !== "actif")
      await tx.update(schema.owners).set({ status: "actif" }).where(eq(schema.owners.id, owner.id));
    if (notifyOwner) await notifyUser(tx, owner?.userId, `${s.brand} ${s.model} : ${submissionStatusLabel(status)}`, note ?? undefined, `/proprietaire/vehicules/${id}`);
  });
  if (notifyOwner && owner?.email) {
    await queueEmail(
      owner.email,
      `Votre véhicule ${s.brand} ${s.model} — ${submissionStatusLabel(status)}`,
      emailLayout(`Suivi de votre proposition ${s.reference}`, [
        `Bonjour ${owner.fullName},`,
        `Votre proposition de partenariat pour le véhicule ${s.brand} ${s.model} est désormais : <strong>${submissionStatusLabel(status)}</strong>.`,
        ...(status === "inspection" && inspectionDate ? [`Inspection prévue le ${inspectionDate}. Nous vous confirmerons le lieu et l'heure.`] : []),
        ...(status === "proposition" ? ["Notre proposition est disponible dans votre espace propriétaire."] : []),
        ...(note ? [note] : []),
      ], { label: "Ouvrir mon espace", url: `${SITE_URL}/proprietaire/vehicules/${id}` }),
    );
  }
  await audit(user.id, "submission.update", "owner_submission", id, { from: s.status, to: status });
  revalidatePath(`/admin/proprietaires/soumissions/${id}`);
  return { ok: true, message: "Soumission mise à jour." };
});

export const setDocumentStatus = buttonAction("owners.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!DOC_STATUSES.some((s) => s.value === status)) throw new UserError("Statut invalide.");
  const [doc] = await db.update(schema.documents).set({ status }).where(eq(schema.documents.id, id)).returning();
  if (!doc) throw new UserError("Document introuvable.");
  await audit(user.id, "document.status", "document", id, { status });
  revalidatePath(`/admin/proprietaires/soumissions/${doc.entityId}`);
  return { ok: true, message: status === "valide" ? "Document validé." : status === "refuse" ? "Document refusé." : "Document remis en attente." };
});

export const integrateSubmission = buttonAction("owners.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const [s] = await db.select().from(schema.ownerSubmissions).where(eq(schema.ownerSubmissions.id, id)).limit(1);
  if (!s) throw new UserError("Soumission introuvable.");
  if (s.vehicleId) throw new UserError("Ce véhicule est déjà intégré à la flotte.");
  if (!["contrat", "proposition"].includes(s.status)) throw new UserError("Intégrez le véhicule après acceptation de la proposition ou signature du contrat.");
  const photos = await db.select({ fileId: schema.documents.fileId }).from(schema.documents).where(eq(schema.documents.entityId, id));
  const vehicleId = await db.transaction(async (tx) => {
    const base = slugify(`${s.brand} ${s.model} ${s.year ?? ""}`) || "vehicule";
    const slug = `${base}-${s.reference.slice(-5).toLowerCase()}`;
    const [v] = await tx
      .insert(schema.vehicles)
      .values({
        slug,
        brand: s.brand,
        model: s.model,
        year: s.year,
        plate: s.plate,
        mileage: s.mileage,
        fuel: s.fuel,
        transmission: s.transmission,
        seats: s.seats,
        ownerId: s.ownerId,
        technicalStatus: "a_inspecter",
        publicationStatus: "brouillon",
      })
      .returning({ id: schema.vehicles.id });
    // Les photos du propriétaire deviennent des photos de la fiche véhicule (toujours en brouillon, non publiées).
    let order = 0;
    for (const p of photos) {
      const [file] = await tx.select({ mime: schema.files.mime }).from(schema.files).where(eq(schema.files.id, p.fileId));
      if (!file?.mime.startsWith("image/")) continue;
      await tx.update(schema.files).set({ isPublic: true, entityType: "vehicle", entityId: v.id }).where(eq(schema.files.id, p.fileId));
      await tx.insert(schema.vehicleImages).values({ vehicleId: v.id, url: `/api/files/${p.fileId}`, alt: `${s.brand} ${s.model}`, sortOrder: ++order });
      if (order === 1) await tx.update(schema.vehicles).set({ coverImage: `/api/files/${p.fileId}` }).where(eq(schema.vehicles.id, v.id));
    }
    await tx.update(schema.ownerSubmissions).set({ vehicleId: v.id, status: "integre", updatedAt: new Date() }).where(eq(schema.ownerSubmissions.id, id));
    await tx.insert(schema.submissionHistory).values({ submissionId: id, fromStatus: s.status, toStatus: "integre", note: "Véhicule intégré à la flotte (fiche en brouillon).", byUserId: user.id });
    await tx.update(schema.owners).set({ status: "actif" }).where(eq(schema.owners.id, s.ownerId));
    return v.id;
  });
  await audit(user.id, "submission.integrate", "owner_submission", id, { vehicleId });
  revalidatePath(`/admin/proprietaires/soumissions/${id}`);
  return { ok: true, message: "Véhicule créé en brouillon dans la flotte. Complétez sa fiche avant publication." };
});
