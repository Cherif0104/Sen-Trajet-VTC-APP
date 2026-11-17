"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, computeTotals, nextReference, notifyUser, queueEmail } from "../core";
import { emailLayout } from "../email";
import { storeFile, validateFile } from "../files";
import { adminAction, bool, buttonAction, dateOrNull, int, oneOf, req, str, UserError } from "../admin/util";
import { CONTRACT_STATUSES, CONTRACT_TYPES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/domain";
import { fcfa } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { LineItem } from "../db/schema";

const todayIso = () => new Date().toISOString().slice(0, 10);

/* ───────── Contrats ───────── */

export const saveContract = adminAction("contracts.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const type = oneOf(fd, "type", CONTRACT_TYPES);
  const customerId = str(fd, "customerId");
  const ownerId = str(fd, "ownerId");
  if (type === "proprietaire" && !ownerId) throw new UserError("Sélectionnez le propriétaire.", { cause: "ownerId" });
  if (type !== "proprietaire" && !customerId) throw new UserError("Sélectionnez le client.", { cause: "customerId" });
  const startDate = dateOrNull(fd, "startDate");
  const endDate = dateOrNull(fd, "endDate");
  if (startDate && endDate && endDate < startDate) throw new UserError("La date de fin précède la date de début.", { cause: "endDate" });
  const sharedWithParty = bool(fd, "sharedWithParty");
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    const err = validateFile(file);
    if (err) throw new UserError(err, { cause: "file" });
  }
  const data = {
    type,
    title: req(fd, "title", "L'intitulé"),
    customerId: type === "proprietaire" ? null : customerId,
    ownerId: type === "proprietaire" ? ownerId : null,
    vehicleId: str(fd, "vehicleId"),
    startDate,
    endDate,
    amount: int(fd, "amount"),
    terms: str(fd, "terms"),
    status: oneOf(fd, "status", CONTRACT_STATUSES, "brouillon"),
    sharedWithParty,
    updatedAt: new Date(),
  };
  const [before] = id ? await db.select().from(schema.contracts).where(eq(schema.contracts.id, id)) : [];
  const contractId = await db.transaction(async (tx) => {
    let cid = id;
    if (id) await tx.update(schema.contracts).set(data).where(eq(schema.contracts.id, id));
    else {
      const number = await nextReference(tx, "contract");
      cid = (await tx.insert(schema.contracts).values({ ...data, number, createdBy: user.id }).returning({ id: schema.contracts.id }))[0].id;
    }
    if (file instanceof File && file.size > 0) {
      const fileId = await storeFile(tx, file, { entityType: "contract", entityId: cid!, uploadedBy: user.id });
      await tx.update(schema.contracts).set({ fileId }).where(eq(schema.contracts.id, cid!));
    }
    return cid!;
  });
  if (sharedWithParty && !before?.sharedWithParty && data.ownerId) {
    const [o] = await db.select().from(schema.owners).where(eq(schema.owners.id, data.ownerId));
    await notifyUser(db, o?.userId, "Un contrat est disponible", data.title, "/proprietaire/contrats");
    if (o?.email)
      await queueEmail(
        o.email,
        "Votre contrat SENTRAJET PREMIUM",
        emailLayout("Un contrat vous a été partagé", [`Bonjour ${o.fullName},`, `Le document « ${data.title} » est disponible dans votre espace propriétaire.`], {
          label: "Consulter",
          url: `${SITE_URL}/proprietaire/contrats`,
        }),
      );
  }
  await audit(user.id, id ? "contract.update" : "contract.create", "contract", contractId, { status: data.status, shared: sharedWithParty });
  revalidatePath("/admin/contrats");
  revalidatePath(`/admin/contrats/${contractId}`);
  return { ok: true, message: "Contrat enregistré.", redirectTo: id ? undefined : `/admin/contrats/${contractId}` };
});

/* ───────── Factures ───────── */

function parseItems(fd: FormData): LineItem[] {
  const labels = fd.getAll("item_label").map(String);
  const qty = fd.getAll("item_qty").map(String);
  const prices = fd.getAll("item_price").map(String);
  const items: LineItem[] = [];
  labels.forEach((label, i) => {
    const l = label.trim();
    if (!l) return;
    const quantity = Number(String(qty[i] ?? "1").replace(",", "."));
    const unitPrice = Math.round(Number(String(prices[i] ?? "0").replace(/\s/g, "")));
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new UserError(`Ligne invalide : « ${l} ».`, { cause: "items" });
    items.push({ label: l.slice(0, 300), quantity, unitPrice });
  });
  if (!items.length) throw new UserError("Ajoutez au moins une ligne.", { cause: "items" });
  return items;
}

export const saveInvoice = adminAction("invoices.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const items = parseItems(fd);
  const taxRate = int(fd, "taxRate") ?? 0;
  if (taxRate < 0 || taxRate > 100) throw new UserError("Taux de TVA invalide.", { cause: "taxRate" });
  const customerId = req(fd, "customerId", "Le client");
  const data = { items, taxRate, ...computeTotals(items, taxRate), customerId, dueAt: dateOrNull(fd, "dueAt"), notes: str(fd, "notes"), updatedAt: new Date() };
  if (id) {
    const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
    if (!inv) throw new UserError("Facture introuvable.");
    if (inv.status !== "brouillon") throw new UserError("Une facture émise ne peut plus être modifiée. Annulez-la et créez-en une nouvelle.");
    await db.update(schema.invoices).set(data).where(eq(schema.invoices.id, id));
    await audit(user.id, "invoice.update", "invoice", id);
    revalidatePath(`/admin/factures/${id}`);
    return { ok: true, message: "Brouillon enregistré." };
  }
  const quoteId = str(fd, "quoteId");
  const requestId = str(fd, "requestId");
  if (quoteId) {
    const [existing] = await db.select({ id: schema.invoices.id }).from(schema.invoices).where(eq(schema.invoices.quoteId, quoteId));
    if (existing) throw new UserError("Une facture existe déjà pour ce devis.");
  }
  const row = await db.transaction(async (tx) => {
    const number = await nextReference(tx, "invoice");
    return (await tx.insert(schema.invoices).values({ ...data, number, quoteId, requestId, createdBy: user.id }).returning({ id: schema.invoices.id }))[0];
  });
  await audit(user.id, "invoice.create", "invoice", row.id);
  redirect(`/admin/factures/${row.id}`);
});

export const issueInvoice = buttonAction("invoices.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
  if (!inv || inv.status !== "brouillon") throw new UserError("Seul un brouillon peut être émis.");
  if (inv.total <= 0) throw new UserError("Le montant de la facture doit être supérieur à zéro.");
  const [c] = inv.customerId ? await db.select().from(schema.customers).where(eq(schema.customers.id, inv.customerId)) : [];
  const issuedAt = todayIso();
  const dueAt = inv.dueAt ?? new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  await db.update(schema.invoices).set({ status: "emise", issuedAt, dueAt, updatedAt: new Date() }).where(eq(schema.invoices.id, id));
  await notifyUser(db, c?.userId, `Nouvelle facture ${inv.number}`, `${fcfa(inv.total)} TTC, échéance ${dueAt}`, "/espace/factures");
  if (c?.email && fd.get("send") !== "0")
    await queueEmail(
      c.email,
      `Facture ${inv.number} — SENTRAJET PREMIUM`,
      emailLayout(`Votre facture ${inv.number}`, [
        `Bonjour ${c.fullName},`,
        `Veuillez trouver notre facture d'un montant de <strong>${fcfa(inv.total)} TTC</strong>, à régler avant le ${dueAt}.`,
        c.userId ? "Elle est téléchargeable en PDF depuis votre espace client." : "Contactez-nous pour en recevoir une copie PDF ou pour toute question.",
      ], c.userId ? { label: "Voir ma facture", url: `${SITE_URL}/espace/factures` } : undefined),
    );
  await audit(user.id, "invoice.issue", "invoice", id);
  revalidatePath(`/admin/factures/${id}`);
  return { ok: true, message: "Facture émise." };
});

export const cancelInvoice = buttonAction("invoices.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
  if (!inv || inv.status === "annulee") throw new UserError("Facture introuvable ou déjà annulée.");
  if (inv.amountPaid > 0) throw new UserError("Cette facture a reçu des paiements : elle ne peut pas être annulée.");
  await db.update(schema.invoices).set({ status: "annulee", updatedAt: new Date() }).where(eq(schema.invoices.id, id));
  await audit(user.id, "invoice.cancel", "invoice", id);
  revalidatePath(`/admin/factures/${id}`);
  return { ok: true, message: "Facture annulée." };
});

export const recordPayment = adminAction("invoices.manage", async (user, fd) => {
  const db = await getDb();
  const invoiceId = req(fd, "invoiceId", "La facture");
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) throw new UserError("Montant invalide.", { cause: "amount" });
  const paidAt = dateOrNull(fd, "paidAt") ?? todayIso();
  if (paidAt > todayIso()) throw new UserError("La date de paiement ne peut pas être future.", { cause: "paidAt" });
  const method = oneOf(fd, "method", PAYMENT_METHODS);
  await db.transaction(async (tx) => {
    const [inv] = await tx.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId));
    if (!inv || !["emise", "partielle"].includes(inv.status)) throw new UserError("La facture doit être émise pour enregistrer un paiement.");
    const remaining = inv.total - inv.amountPaid;
    if (amount > remaining) throw new UserError(`Le montant dépasse le reste à payer (${fcfa(remaining)}).`, { cause: "amount" });
    await tx.insert(schema.payments).values({ direction: "encaissement", invoiceId, amount, method, reference: str(fd, "reference"), paidAt, notes: str(fd, "notes"), createdBy: user.id });
    const amountPaid = inv.amountPaid + amount;
    await tx.update(schema.invoices).set({ amountPaid, status: amountPaid >= inv.total ? "payee" : "partielle", updatedAt: new Date() }).where(eq(schema.invoices.id, invoiceId));
  });
  await audit(user.id, "payment.record", "invoice", invoiceId, { amount, method });
  revalidatePath(`/admin/factures/${invoiceId}`);
  return { ok: true, message: "Paiement enregistré." };
});

/* ───────── Reversements propriétaires & dépenses ───────── */

export const recordOwnerPayout = adminAction("finance.manage", async (user, fd) => {
  const db = await getDb();
  const ownerId = req(fd, "ownerId", "Le propriétaire");
  const amount = int(fd, "amount");
  if (!amount || amount <= 0) throw new UserError("Montant invalide.", { cause: "amount" });
  const paidAt = dateOrNull(fd, "paidAt") ?? todayIso();
  const method = oneOf(fd, "method", PAYMENT_METHODS);
  const [o] = await db.select().from(schema.owners).where(eq(schema.owners.id, ownerId));
  if (!o) throw new UserError("Propriétaire introuvable.", { cause: "ownerId" });
  await db.insert(schema.payments).values({
    direction: "decaissement",
    ownerId,
    contractId: str(fd, "contractId"),
    amount,
    method,
    reference: str(fd, "reference"),
    paidAt,
    notes: str(fd, "notes"),
    createdBy: user.id,
  });
  await notifyUser(db, o.userId, "Reversement enregistré", `${fcfa(amount)} le ${paidAt}`, "/proprietaire/paiements");
  await audit(user.id, "payout.record", "owner", ownerId, { amount });
  revalidatePath("/admin/finances");
  return { ok: true, message: "Reversement enregistré." };
});

export const saveExpense = adminAction("finance.manage", async (user, fd) => {
  const db = await getDb();
  const amountHt = int(fd, "amountHt");
  if (amountHt === null || amountHt <= 0) throw new UserError("Montant HT invalide.", { cause: "amountHt" });
  const taxAmount = int(fd, "taxAmount") ?? 0;
  if (taxAmount < 0) throw new UserError("TVA invalide.", { cause: "taxAmount" });
  const receipt = fd.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    const err = validateFile(receipt);
    if (err) throw new UserError(err, { cause: "receipt" });
  }
  await db.transaction(async (tx) => {
    const [e] = await tx
      .insert(schema.expenses)
      .values({
        category: oneOf(fd, "category", EXPENSE_CATEGORIES),
        vehicleId: str(fd, "vehicleId"),
        label: req(fd, "label", "Le libellé"),
        amountHt,
        taxAmount,
        amountTtc: amountHt + taxAmount,
        spentAt: dateOrNull(fd, "spentAt") ?? todayIso(),
        supplier: str(fd, "supplier"),
        notes: str(fd, "notes"),
        createdBy: user.id,
      })
      .returning({ id: schema.expenses.id });
    if (receipt instanceof File && receipt.size > 0) {
      const fileId = await storeFile(tx, receipt, { entityType: "expense", entityId: e.id, uploadedBy: user.id });
      await tx.insert(schema.documents).values({ fileId, entityType: "expense", entityId: e.id, docType: "autre", label: "Justificatif", status: "valide", uploadedBy: user.id });
    }
  });
  await audit(user.id, "expense.create", "expense");
  revalidatePath("/admin/finances");
  return { ok: true, message: "Dépense enregistrée." };
});

export const deleteExpense = buttonAction("finance.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
  await audit(user.id, "expense.delete", "expense", id);
  revalidatePath("/admin/finances");
  return { ok: true, message: "Dépense supprimée." };
});
