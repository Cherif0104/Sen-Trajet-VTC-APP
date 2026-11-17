"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { audit, computeTotals, nextReference, notifyUser, queueEmail } from "../core";
import { emailLayout } from "../email";
import { getSettings } from "../settings";
import { adminAction, buttonAction, datetimeOrNull, dateOrNull, int, oneOf, req, str, UserError } from "../admin/util";
import { MISSION_STATUSES, QUOTE_STATUSES, REQUEST_STATUSES, requestStatusLabel } from "@/lib/domain";
import { fcfa } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { LineItem } from "../db/schema";

/* ───────── Demandes ───────── */

export const changeRequestStatus = adminAction("requests.manage", async (user, fd) => {
  const db = await getDb();
  const id = req(fd, "id", "La demande");
  const status = oneOf(fd, "status", REQUEST_STATUSES);
  const note = str(fd, "note");
  const notifyClient = fd.get("notifyClient") === "on";
  const [r] = await db.select().from(schema.requests).where(eq(schema.requests.id, id)).limit(1);
  if (!r) throw new UserError("Demande introuvable.");
  if (r.status === status && !note) throw new UserError("Choisissez un nouveau statut ou ajoutez une note.");
  await db.transaction(async (tx) => {
    await tx.update(schema.requests).set({ status, updatedAt: new Date() }).where(eq(schema.requests.id, id));
    await tx.insert(schema.requestHistory).values({ requestId: id, fromStatus: r.status, toStatus: status, note, byUserId: user.id });
    if (notifyClient && r.userId)
      await notifyUser(tx, r.userId, `Demande ${r.reference} : ${requestStatusLabel(status)}`, note ?? undefined, `/espace/demandes/${r.id}`);
  });
  if (notifyClient) {
    await queueEmail(
      r.email,
      `Votre demande ${r.reference} — ${requestStatusLabel(status)}`,
      emailLayout(`Mise à jour de votre demande ${r.reference}`, [
        `Bonjour ${r.contactName},`,
        `Le statut de votre demande est désormais : <strong>${requestStatusLabel(status)}</strong>.`,
        ...(note ? [note] : []),
      ], r.userId ? { label: "Suivre ma demande", url: `${SITE_URL}/espace/demandes/${r.id}` } : undefined),
    );
  }
  await audit(user.id, "request.status", "request", id, { from: r.status, to: status });
  revalidatePath(`/admin/demandes/${id}`);
  return { ok: true, message: "Statut mis à jour." };
});

export const updateRequestInternal = adminAction("requests.manage", async (user, fd) => {
  const db = await getDb();
  const id = req(fd, "id", "La demande");
  const assignedTo = str(fd, "assignedTo");
  if (assignedTo) {
    const [u] = await db.select({ role: schema.users.role }).from(schema.users).where(eq(schema.users.id, assignedTo)).limit(1);
    if (!u || !["super_admin", "admin", "commercial", "flotte", "financier"].includes(u.role)) throw new UserError("Collaborateur invalide.", { cause: "assignedTo" });
  }
  await db
    .update(schema.requests)
    .set({ assignedTo, internalNotes: str(fd, "internalNotes"), updatedAt: new Date() })
    .where(eq(schema.requests.id, id));
  if (assignedTo && assignedTo !== user.id) {
    const [r] = await db.select({ reference: schema.requests.reference }).from(schema.requests).where(eq(schema.requests.id, id));
    await notifyUser(db, assignedTo, `Demande ${r?.reference} assignée`, `Par ${user.fullName}`, `/admin/demandes/${id}`);
  }
  await audit(user.id, "request.update", "request", id);
  revalidatePath(`/admin/demandes/${id}`);
});

export const attachRequestToCustomer = adminAction("requests.manage", async (user, fd) => {
  const db = await getDb();
  const id = req(fd, "id", "La demande");
  const customerId = req(fd, "customerId", "Le client");
  const [c] = await db.select().from(schema.customers).where(eq(schema.customers.id, customerId)).limit(1);
  if (!c) throw new UserError("Client introuvable.", { cause: "customerId" });
  await db.update(schema.requests).set({ customerId: c.id, userId: c.userId, updatedAt: new Date() }).where(eq(schema.requests.id, id));
  await audit(user.id, "request.attach_customer", "request", id, { customerId });
  revalidatePath(`/admin/demandes/${id}`);
  return { ok: true, message: "Demande rattachée au client." };
});

/* ───────── Devis ───────── */

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
    if (!Number.isFinite(quantity) || quantity <= 0) throw new UserError(`Quantité invalide pour « ${l} ».`, { cause: "items" });
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new UserError(`Prix invalide pour « ${l} ».`, { cause: "items" });
    items.push({ label: l.slice(0, 300), quantity, unitPrice });
  });
  if (items.length === 0) throw new UserError("Ajoutez au moins une ligne.", { cause: "items" });
  return items;
}

const parseTax = (fd: FormData) => {
  const t = int(fd, "taxRate") ?? 0;
  if (t < 0 || t > 100) throw new UserError("Taux de TVA invalide.", { cause: "taxRate" });
  return t;
};

export const saveQuote = adminAction("quotes.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const items = parseItems(fd);
  const taxRate = parseTax(fd);
  const totals = computeTotals(items, taxRate);
  const data = {
    items,
    taxRate,
    ...totals,
    validUntil: dateOrNull(fd, "validUntil"),
    notes: str(fd, "notes"),
    customerId: str(fd, "customerId"),
    updatedAt: new Date(),
  };
  if (id) {
    const [q] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).limit(1);
    if (!q) throw new UserError("Devis introuvable.");
    if (q.status !== "brouillon") throw new UserError("Seul un devis en brouillon peut être modifié. Créez un nouveau devis.");
    await db.update(schema.quotes).set(data).where(eq(schema.quotes.id, id));
    await audit(user.id, "quote.update", "quote", id);
    revalidatePath(`/admin/devis/${id}`);
    return { ok: true, message: "Devis enregistré." };
  }
  const requestId = str(fd, "requestId");
  let customerId = data.customerId;
  if (requestId) {
    const [r] = await db.select({ customerId: schema.requests.customerId }).from(schema.requests).where(eq(schema.requests.id, requestId));
    customerId = customerId ?? r?.customerId ?? null;
  }
  if (!customerId) throw new UserError("Sélectionnez un client.", { cause: "customerId" });
  const created = await db.transaction(async (tx) => {
    const number = await nextReference(tx, "quote");
    const [row] = await tx
      .insert(schema.quotes)
      .values({ ...data, customerId, number, requestId, createdBy: user.id })
      .returning({ id: schema.quotes.id });
    return row;
  });
  await audit(user.id, "quote.create", "quote", created.id);
  redirect(`/admin/devis/${created.id}`);
});

export const sendQuote = buttonAction("quotes.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const [q] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).limit(1);
  if (!q || q.status !== "brouillon") throw new UserError("Ce devis ne peut pas être envoyé.");
  const [c] = q.customerId ? await db.select().from(schema.customers).where(eq(schema.customers.id, q.customerId)) : [];
  const r = q.requestId ? (await db.select().from(schema.requests).where(eq(schema.requests.id, q.requestId)))[0] : undefined;
  const email = c?.email ?? r?.email;
  if (!email) throw new UserError("Le client n'a pas d'adresse e-mail.");
  await db.transaction(async (tx) => {
    await tx.update(schema.quotes).set({ status: "envoye", sentAt: new Date(), updatedAt: new Date() }).where(eq(schema.quotes.id, id));
    if (r && ["nouvelle", "en_attente", "verification", "devis_envoye"].includes(r.status)) {
      await tx.update(schema.requests).set({ status: "attente_client", updatedAt: new Date() }).where(eq(schema.requests.id, r.id));
      await tx.insert(schema.requestHistory).values({
        requestId: r.id,
        fromStatus: r.status,
        toStatus: "attente_client",
        note: `Devis ${q.number} envoyé (${fcfa(q.total)} TTC).`,
        byUserId: user.id,
      });
    }
    await notifyUser(tx, c?.userId ?? r?.userId, `Nouveau devis ${q.number}`, `Montant : ${fcfa(q.total)} TTC`, "/espace/devis");
  });
  const hasAccount = Boolean(c?.userId ?? r?.userId);
  await queueEmail(
    email,
    `Votre devis ${q.number} — SENTRAJET PREMIUM`,
    emailLayout(`Votre devis ${q.number}`, [
      `Bonjour ${c?.fullName ?? r?.contactName ?? ""},`,
      `Nous avons le plaisir de vous adresser notre proposition pour un montant de <strong>${fcfa(q.total)} TTC</strong>${q.validUntil ? `, valable jusqu'au ${q.validUntil}` : ""}.`,
      hasAccount
        ? "Vous pouvez le consulter, le télécharger en PDF et l'accepter depuis votre espace client."
        : "Répondez à ce message ou contactez-nous par téléphone pour le valider.",
    ], hasAccount ? { label: "Voir mon devis", url: `${SITE_URL}/espace/devis` } : undefined),
  );
  await audit(user.id, "quote.send", "quote", id);
  revalidatePath(`/admin/devis/${id}`);
});

export const setQuoteStatus = buttonAction("quotes.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!QUOTE_STATUSES.some((s) => s.value === status) || status === "brouillon") throw new UserError("Statut invalide.");
  const [q] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).limit(1);
  if (!q || q.status === "brouillon") throw new UserError("Envoyez le devis avant de changer son statut.");
  await db.transaction(async (tx) => {
    await tx.update(schema.quotes).set({ status, respondedAt: new Date(), updatedAt: new Date() }).where(eq(schema.quotes.id, id));
    if (status === "accepte" && q.requestId) {
      const [r] = await tx.select().from(schema.requests).where(eq(schema.requests.id, q.requestId));
      if (r && !["acceptee", "confirmee", "en_cours", "terminee"].includes(r.status)) {
        await tx.update(schema.requests).set({ status: "acceptee", updatedAt: new Date() }).where(eq(schema.requests.id, r.id));
        await tx.insert(schema.requestHistory).values({ requestId: r.id, fromStatus: r.status, toStatus: "acceptee", note: `Devis ${q.number} accepté (saisi par l'équipe).`, byUserId: user.id });
      }
    }
  });
  await audit(user.id, "quote.status", "quote", id, { status });
  revalidatePath(`/admin/devis/${id}`);
});

export const duplicateQuote = buttonAction("quotes.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const [q] = await db.select().from(schema.quotes).where(eq(schema.quotes.id, id)).limit(1);
  if (!q) throw new UserError("Devis introuvable.");
  const settings = await getSettings();
  const row = await db.transaction(async (tx) => {
    const number = await nextReference(tx, "quote");
    const valid = new Date(Date.now() + settings.finance.quoteValidityDays * 86400000).toISOString().slice(0, 10);
    const [r] = await tx
      .insert(schema.quotes)
      .values({
        number,
        requestId: q.requestId,
        customerId: q.customerId,
        items: q.items,
        subtotal: q.subtotal,
        taxRate: q.taxRate,
        taxAmount: q.taxAmount,
        total: q.total,
        validUntil: valid,
        notes: q.notes,
        createdBy: user.id,
      })
      .returning({ id: schema.quotes.id });
    return r;
  });
  await audit(user.id, "quote.duplicate", "quote", row.id, { from: id });
  redirect(`/admin/devis/${row.id}`);
});

/* ───────── Missions ───────── */

export const saveMission = adminAction("missions.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const startAt = datetimeOrNull(fd, "startAt");
  const endAt = datetimeOrNull(fd, "endAt");
  if (!startAt) throw new UserError("La date de début est obligatoire.", { cause: "startAt" });
  if (endAt && endAt < startAt) throw new UserError("La fin doit être postérieure au début.", { cause: "endAt" });
  const mileageStart = int(fd, "mileageStart");
  const mileageEnd = int(fd, "mileageEnd");
  if (mileageStart !== null && mileageEnd !== null && mileageEnd < mileageStart)
    throw new UserError("Kilométrage d'arrivée inférieur au départ.", { cause: "mileageEnd" });
  const data = {
    requestId: str(fd, "requestId"),
    customerId: str(fd, "customerId"),
    vehicleId: str(fd, "vehicleId"),
    driverId: str(fd, "driverId"),
    startAt,
    endAt,
    pickup: str(fd, "pickup"),
    destination: str(fd, "destination"),
    status: oneOf(fd, "status", MISSION_STATUSES, "planifiee"),
    mileageStart,
    mileageEnd,
    notes: str(fd, "notes"),
    updatedAt: new Date(),
  };
  if (data.requestId && !data.customerId) {
    const [r] = await db.select({ customerId: schema.requests.customerId }).from(schema.requests).where(eq(schema.requests.id, data.requestId));
    data.customerId = r?.customerId ?? null;
  }
  const conflictsWarn: string[] = [];
  if (data.driverId || data.vehicleId) {
    const others = await db
      .select({ id: schema.missions.id, reference: schema.missions.reference, startAt: schema.missions.startAt, endAt: schema.missions.endAt, driverId: schema.missions.driverId, vehicleId: schema.missions.vehicleId })
      .from(schema.missions)
      .where(inArray(schema.missions.status, ["planifiee", "en_cours"]));
    const s = startAt.getTime();
    const e = (endAt ?? new Date(s + 4 * 3600000)).getTime();
    for (const o of others) {
      if (o.id === id || !o.startAt) continue;
      const os = o.startAt.getTime();
      const oe = (o.endAt ?? new Date(os + 4 * 3600000)).getTime();
      if (os < e && s < oe && ((data.driverId && o.driverId === data.driverId) || (data.vehicleId && o.vehicleId === data.vehicleId)))
        conflictsWarn.push(o.reference);
    }
  }
  let missionId = id;
  if (id) {
    await db.update(schema.missions).set(data).where(eq(schema.missions.id, id));
    await audit(user.id, "mission.update", "mission", id);
  } else {
    const row = await db.transaction(async (tx) => {
      const reference = await nextReference(tx, "mission");
      const [m] = await tx.insert(schema.missions).values({ ...data, reference }).returning();
      if (data.requestId) {
        const [r] = await tx.select().from(schema.requests).where(eq(schema.requests.id, data.requestId));
        if (r && ["acceptee", "nouvelle", "en_attente", "verification", "attente_client", "devis_envoye"].includes(r.status)) {
          await tx.update(schema.requests).set({ status: "confirmee", updatedAt: new Date() }).where(eq(schema.requests.id, r.id));
          await tx.insert(schema.requestHistory).values({ requestId: r.id, fromStatus: r.status, toStatus: "confirmee", note: `Mission ${reference} planifiée.`, byUserId: user.id });
          await notifyUser(tx, r.userId, `Réservation ${r.reference} confirmée`, undefined, `/espace/demandes/${r.id}`);
        }
      }
      return m;
    });
    missionId = row.id;
    await audit(user.id, "mission.create", "mission", row.id);
  }
  if (data.driverId) {
    const [d] = await db.select({ userId: schema.drivers.userId }).from(schema.drivers).where(eq(schema.drivers.id, data.driverId));
    if (d?.userId) await notifyUser(db, d.userId, id ? "Mission mise à jour" : "Nouvelle mission assignée", data.pickup ?? undefined, "/chauffeur");
  }
  revalidatePath("/admin/missions");
  const message = conflictsWarn.length
    ? `Mission enregistrée. Attention : chevauchement avec ${conflictsWarn.join(", ")}.`
    : "Mission enregistrée.";
  return { ok: true, message, redirectTo: id ? undefined : `/admin/missions/${missionId}` };
});

export const deleteDraftQuote = buttonAction("quotes.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const res = await db.delete(schema.quotes).where(and(eq(schema.quotes.id, id), eq(schema.quotes.status, "brouillon"))).returning({ id: schema.quotes.id });
  if (res.length) await audit(user.id, "quote.delete", "quote", id);
  redirect("/admin/devis");
});
