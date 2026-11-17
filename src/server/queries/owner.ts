import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../db";

const { owners, ownerSubmissions, documents, contracts, payments, vehicles, files } = schema;

export async function getOwnerForUser(userId: string) {
  const db = await getDb();
  const [o] = await db.select().from(owners).where(eq(owners.userId, userId)).limit(1);
  return o ?? null;
}

export async function ownerSubmissionsList(ownerId: string) {
  const db = await getDb();
  return db.select().from(ownerSubmissions).where(eq(ownerSubmissions.ownerId, ownerId)).orderBy(desc(ownerSubmissions.createdAt));
}

export async function ownerSubmission(ownerId: string, id: string) {
  const db = await getDb();
  const [s] = await db
    .select()
    .from(ownerSubmissions)
    .where(and(eq(ownerSubmissions.id, id), eq(ownerSubmissions.ownerId, ownerId)))
    .limit(1);
  if (!s) return null;
  const [history, docs] = await Promise.all([
    db.select().from(schema.submissionHistory).where(eq(schema.submissionHistory.submissionId, id)).orderBy(desc(schema.submissionHistory.createdAt)),
    submissionDocuments(id),
  ]);
  return { ...s, history, documents: docs };
}

export async function submissionDocuments(submissionId: string) {
  const db = await getDb();
  return db
    .select({
      id: documents.id,
      docType: documents.docType,
      label: documents.label,
      status: documents.status,
      expiresAt: documents.expiresAt,
      createdAt: documents.createdAt,
      fileId: documents.fileId,
      fileName: files.name,
      mime: files.mime,
    })
    .from(documents)
    .innerJoin(files, eq(files.id, documents.fileId))
    .where(and(eq(documents.entityType, "owner_submission"), eq(documents.entityId, submissionId)))
    .orderBy(desc(documents.createdAt));
}

export async function ownerDocuments(ownerId: string) {
  const db = await getDb();
  const subs = await db.select({ id: ownerSubmissions.id, brand: ownerSubmissions.brand, model: ownerSubmissions.model, reference: ownerSubmissions.reference }).from(ownerSubmissions).where(eq(ownerSubmissions.ownerId, ownerId));
  if (!subs.length) return [];
  const rows = await db
    .select({
      id: documents.id,
      entityId: documents.entityId,
      docType: documents.docType,
      status: documents.status,
      expiresAt: documents.expiresAt,
      createdAt: documents.createdAt,
      fileId: documents.fileId,
      fileName: files.name,
    })
    .from(documents)
    .innerJoin(files, eq(files.id, documents.fileId))
    .where(and(eq(documents.entityType, "owner_submission"), inArray(documents.entityId, subs.map((s) => s.id))))
    .orderBy(desc(documents.createdAt));
  return rows.map((r) => ({ ...r, submission: subs.find((s) => s.id === r.entityId)! }));
}

export async function ownerContracts(ownerId: string) {
  const db = await getDb();
  return db
    .select({ contract: contracts, vehicleName: sql<string | null>`${vehicles.brand} || ' ' || ${vehicles.model}` })
    .from(contracts)
    .leftJoin(vehicles, eq(vehicles.id, contracts.vehicleId))
    .where(and(eq(contracts.ownerId, ownerId), eq(contracts.sharedWithParty, true)))
    .orderBy(desc(contracts.createdAt));
}

export async function ownerPayments(ownerId: string) {
  const db = await getDb();
  return db
    .select({ payment: payments, contractNumber: contracts.number })
    .from(payments)
    .leftJoin(contracts, eq(contracts.id, payments.contractId))
    .where(and(eq(payments.ownerId, ownerId), eq(payments.direction, "decaissement")))
    .orderBy(desc(payments.paidAt));
}

export async function ownerVehicles(ownerId: string) {
  const db = await getDb();
  return db
    .select({
      id: vehicles.id,
      brand: vehicles.brand,
      model: vehicles.model,
      plate: vehicles.plate,
      commercialStatus: vehicles.commercialStatus,
      technicalStatus: vehicles.technicalStatus,
      coverImage: vehicles.coverImage,
    })
    .from(vehicles)
    .where(eq(vehicles.ownerId, ownerId));
}
