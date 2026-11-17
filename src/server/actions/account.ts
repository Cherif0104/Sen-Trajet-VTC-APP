"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import { assertRole, getCurrentUser, hashPassword, verifyPassword } from "../auth";
import { audit, notifyStaff } from "../core";
import { myCustomerIds } from "../queries/client";
import { fail, zodErrors, type ActionState } from "@/lib/action-state";

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Session expirée." };
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Nom trop court").max(120),
      phone: z.string().trim().min(7, "Téléphone invalide").max(25),
      companyName: z.string().trim().max(160).optional(),
      jobTitle: z.string().trim().max(120).optional(),
      address: z.string().trim().max(250).optional(),
      city: z.string().trim().max(80).optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(fd, "Certains champs sont à corriger.", zodErrors(parsed.error));
  const d = parsed.data;
  const db = await getDb();
  await db
    .update(schema.users)
    .set({
      fullName: d.fullName,
      phone: d.phone,
      companyName: d.companyName || null,
      jobTitle: d.jobTitle || null,
      address: d.address || null,
      city: d.city || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));
  if (user.role === "client") {
    await db
      .update(schema.customers)
      .set({ fullName: d.fullName, phone: d.phone, companyName: d.companyName || null, city: d.city || null, address: d.address || null, updatedAt: new Date() })
      .where(eq(schema.customers.userId, user.id));
  }
  if (user.role === "proprietaire") {
    await db
      .update(schema.owners)
      .set({ fullName: d.fullName, phone: d.phone, companyName: d.companyName || null, city: d.city || null, address: d.address || null, updatedAt: new Date() })
      .where(eq(schema.owners.userId, user.id));
  }
  await audit(user.id, "profile.update", "user", user.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil mis à jour." };
}

export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Session expirée." };
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (next.length < 8) return { ok: false, message: "Le nouveau mot de passe doit contenir au moins 8 caractères.", errors: { password: "8 caractères minimum" } };
  if (next !== confirm) return { ok: false, message: "Les mots de passe ne correspondent pas.", errors: { confirm: "Ne correspond pas" } };
  const db = await getDb();
  const [u] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!u || !(await verifyPassword(current, u.hash))) return { ok: false, message: "Mot de passe actuel incorrect.", errors: { current: "Incorrect" } };
  await db.update(schema.users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(schema.users.id, user.id));
  await audit(user.id, "profile.password_change", "user", user.id);
  return { ok: true, message: "Mot de passe modifié." };
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  const db = await getDb();
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
  revalidatePath("/", "layout");
}

export async function respondToQuote(fd: FormData) {
  const user = await assertRole("client");
  const quoteId = String(fd.get("quoteId") ?? "");
  const decision = fd.get("decision") === "accept" ? "accepte" : "refuse";
  const db = await getDb();
  const ids = await myCustomerIds(user.id);
  if (!ids.length) throw new Error("Devis introuvable.");
  const [q] = await db
    .select()
    .from(schema.quotes)
    .where(and(eq(schema.quotes.id, quoteId), inArray(schema.quotes.customerId, ids)))
    .limit(1);
  if (!q || q.status !== "envoye") throw new Error("Ce devis ne peut plus être modifié.");
  if (q.validUntil && q.validUntil < new Date().toISOString().slice(0, 10)) throw new Error("Ce devis a expiré.");

  await db.transaction(async (tx) => {
    await tx.update(schema.quotes).set({ status: decision, respondedAt: new Date(), updatedAt: new Date() }).where(eq(schema.quotes.id, q.id));
    if (q.requestId) {
      const [r] = await tx.select({ status: schema.requests.status }).from(schema.requests).where(eq(schema.requests.id, q.requestId));
      const toStatus = decision === "accepte" ? "acceptee" : (r?.status ?? "attente_client");
      if (decision === "accepte") await tx.update(schema.requests).set({ status: "acceptee", updatedAt: new Date() }).where(eq(schema.requests.id, q.requestId));
      await tx.insert(schema.requestHistory).values({
        requestId: q.requestId,
        fromStatus: r?.status ?? null,
        toStatus,
        note: decision === "accepte" ? `Devis ${q.number} accepté par le client` : `Devis ${q.number} refusé par le client`,
        byUserId: user.id,
      });
    }
    await notifyStaff(tx, "quotes.manage", `Devis ${q.number} ${decision === "accepte" ? "accepté" : "refusé"}`, user.fullName, q.requestId ? `/admin/demandes/${q.requestId}` : `/admin/devis`);
  });
  await audit(user.id, `quote.${decision}`, "quote", q.id, { number: q.number });
  revalidatePath("/espace", "layout");
}

export async function submitTestimonial(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await assertRole("client");
  const parsed = z
    .object({
      content: z.string().trim().min(20, "Votre avis est trop court (20 caractères minimum)").max(1200),
      rating: z.coerce.number().int().min(1).max(5),
      authorRole: z.string().trim().max(120).optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(fd, "Certains champs sont à corriger.", zodErrors(parsed.error));
  const db = await getDb();
  await db.insert(schema.testimonials).values({
    authorName: user.fullName,
    authorRole: parsed.data.authorRole || null,
    company: user.companyName,
    content: parsed.data.content,
    rating: parsed.data.rating,
    status: "en_attente",
    userId: user.id,
  });
  await notifyStaff(db, "content.manage", "Nouveau témoignage à valider", user.fullName, "/admin/temoignages");
  await audit(user.id, "testimonial.create", "testimonial", null);
  return { ok: true, message: "Merci ! Votre avis sera publié après validation par notre équipe." };
}
