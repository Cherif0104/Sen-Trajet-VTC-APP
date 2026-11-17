"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gt, ne } from "drizzle-orm";
import { getDb, schema } from "../db";
import { assertPermission, hashPassword } from "../auth";
import { audit, queueEmail } from "../core";
import { emailLayout, sendQueuedEmail } from "../email";
import { fileUrl, storeFile, validateFile } from "../files";
import { adminAction, bool, buttonAction, int, oneOf, req, str, UserError } from "../admin/util";
import { ACCOUNT_TYPES, ROLES, TESTIMONIAL_STATUSES, type Role } from "@/lib/domain";
import { SITE_URL } from "@/lib/site";

async function putSetting(key: string, value: unknown) {
  const db = await getDb();
  await db
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

const refreshSite = () => revalidatePath("/", "layout");

/* ───────── Contenus (CMS) ───────── */

export const saveContentSection = adminAction("content.manage", async (user, fd) => {
  const section = req(fd, "section", "La section");
  const db = await getDb();
  let value: unknown;
  switch (section) {
    case "company": {
      const email = str(fd, "email");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError("E-mail invalide.", { cause: "email" });
      const whatsapp = (str(fd, "whatsapp") ?? "").replace(/\D/g, "");
      if (whatsapp && whatsapp.length < 8) throw new UserError("Numéro WhatsApp invalide (format international sans +, ex. 221788324069).", { cause: "whatsapp" });
      value = {
        legalName: req(fd, "legalName", "La raison sociale"),
        phone: req(fd, "phone", "Le téléphone"),
        whatsapp,
        email: email ?? "",
        address: str(fd, "address") ?? "",
        city: str(fd, "city") ?? "",
        hours: str(fd, "hours") ?? "",
        ninea: str(fd, "ninea") ?? "",
        rccm: str(fd, "rccm") ?? "",
      };
      break;
    }
    case "hero":
      value = { title: req(fd, "title", "Le titre"), subtitle: req(fd, "subtitle", "Le sous-titre") };
      break;
    case "stats": {
      const labels = fd.getAll("stat_label").map(String);
      const values = fd.getAll("stat_value").map(String);
      value = labels
        .map((label, i) => ({ label: label.trim(), value: (values[i] ?? "").trim() }))
        .filter((s) => s.label && s.value)
        .slice(0, 6);
      break;
    }
    case "about":
      value = {
        intro: req(fd, "intro", "L'introduction"),
        mission: str(fd, "mission") ?? "",
        vision: str(fd, "vision") ?? "",
        values: (str(fd, "values") ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 10),
      };
      break;
    case "social": {
      const url = (k: string) => {
        const v = str(fd, k);
        if (v && !/^https:\/\//.test(v)) throw new UserError("L'adresse doit commencer par https://", { cause: k });
        return v ?? "";
      };
      value = { facebook: url("facebook"), instagram: url("instagram"), linkedin: url("linkedin") };
      break;
    }
    case "faq": {
      const qs = fd.getAll("faq_q").map(String);
      const as = fd.getAll("faq_a").map(String);
      value = qs
        .map((q, i) => ({ q: q.trim(), a: (as[i] ?? "").trim() }))
        .filter((x) => x.q && x.a)
        .slice(0, 30);
      break;
    }
    case "legal":
      value = { mentions: str(fd, "mentions") ?? "", confidentialite: str(fd, "confidentialite") ?? "", cgv: str(fd, "cgv") ?? "" };
      break;
    case "branding": {
      const logo = fd.get("logo");
      if (bool(fd, "removeLogo")) value = { logoUrl: null };
      else if (logo instanceof File && logo.size > 0) {
        const err = validateFile(logo, { imagesOnly: true });
        if (err) throw new UserError(err, { cause: "logo" });
        value = { logoUrl: fileUrl(await storeFile(db, logo, { isPublic: true, entityType: "content", uploadedBy: user.id })) };
      } else throw new UserError("Choisissez un fichier de logo.", { cause: "logo" });
      break;
    }
    case "finance": {
      await assertPermission("settings.manage");
      const taxRate = int(fd, "taxRate") ?? 18;
      const quoteValidityDays = int(fd, "quoteValidityDays") ?? 15;
      if (taxRate < 0 || taxRate > 100) throw new UserError("Taux invalide.", { cause: "taxRate" });
      if (quoteValidityDays < 1 || quoteValidityDays > 365) throw new UserError("Durée invalide.", { cause: "quoteValidityDays" });
      value = { taxRate, quoteValidityDays, paymentTerms: str(fd, "paymentTerms") ?? "" };
      break;
    }
    default:
      throw new UserError("Section inconnue.");
  }
  await putSetting(section, value);
  await audit(user.id, "content.update", "settings", section);
  refreshSite();
  return { ok: true, message: "Contenu mis à jour." };
});

/* ───────── Partenaires ───────── */

export const savePartner = adminAction("content.manage", async (user, fd) => {
  const db = await getDb();
  const id = str(fd, "id");
  const authorizationConfirmed = bool(fd, "authorizationConfirmed");
  const isPublished = bool(fd, "isPublished");
  if (isPublished && !authorizationConfirmed)
    throw new UserError("Impossible de publier un partenaire sans autorisation écrite d'utiliser son nom et son logo.", { cause: "isPublished" });
  const website = str(fd, "website");
  if (website && !/^https?:\/\//.test(website)) throw new UserError("Adresse du site invalide.", { cause: "website" });
  const logo = fd.get("logo");
  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    const err = validateFile(logo, { imagesOnly: true });
    if (err) throw new UserError(err, { cause: "logo" });
    logoUrl = fileUrl(await storeFile(db, logo, { isPublic: true, entityType: "content", uploadedBy: user.id }));
  }
  const data = { name: req(fd, "name", "Le nom"), sector: str(fd, "sector"), website, authorizationConfirmed, isPublished, sortOrder: int(fd, "sortOrder") ?? 0, ...(logoUrl ? { logoUrl } : {}) };
  if (id) await db.update(schema.partners).set(data).where(eq(schema.partners.id, id));
  else await db.insert(schema.partners).values(data);
  await audit(user.id, id ? "partner.update" : "partner.create", "partner", id, { authorizationConfirmed, isPublished });
  refreshSite();
  return { ok: true, message: "Partenaire enregistré." };
});

export const deletePartner = buttonAction("content.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  await db.delete(schema.partners).where(eq(schema.partners.id, id));
  await audit(user.id, "partner.delete", "partner", id);
  refreshSite();
  return { ok: true, message: "Partenaire supprimé." };
});

/* ───────── Témoignages ───────── */

export const setTestimonialStatus = buttonAction("content.manage", async (user, fd) => {
  const db = await getDb();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (!TESTIMONIAL_STATUSES.some((s) => s.value === status)) throw new UserError("Statut invalide.");
  await db.update(schema.testimonials).set({ status }).where(eq(schema.testimonials.id, id));
  await audit(user.id, "testimonial.status", "testimonial", id, { status });
  refreshSite();
  return { ok: true, message: status === "publie" ? "Témoignage publié." : "Témoignage mis à jour." };
});

export const createTestimonial = adminAction("content.manage", async (user, fd) => {
  const db = await getDb();
  if (!bool(fd, "consent")) throw new UserError("Confirmez que l'auteur a donné son accord pour la publication.", { cause: "consent" });
  const rating = int(fd, "rating");
  if (rating !== null && (rating < 1 || rating > 5)) throw new UserError("Note entre 1 et 5.", { cause: "rating" });
  await db.insert(schema.testimonials).values({
    authorName: req(fd, "authorName", "Le nom"),
    authorRole: str(fd, "authorRole"),
    company: str(fd, "company"),
    content: req(fd, "content", "Le témoignage"),
    rating,
    status: "en_attente",
  });
  await audit(user.id, "testimonial.create", "testimonial");
  revalidatePath("/admin/temoignages");
  return { ok: true, message: "Témoignage ajouté (en attente de publication)." };
});

/* ───────── Utilisateurs & rôles ───────── */

function assertCanManageRole(actor: Role, target: Role) {
  if (target === "super_admin" && actor !== "super_admin") throw new UserError("Seul un super administrateur peut gérer ce rôle.", { cause: "role" });
  if (target === "admin" && actor !== "super_admin" && actor !== "admin") throw new UserError("Rôle non autorisé.", { cause: "role" });
}

export const createUser = adminAction("users.manage", async (user, fd) => {
  const db = await getDb();
  const email = req(fd, "email", "L'e-mail").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError("E-mail invalide.", { cause: "email" });
  const role = oneOf(fd, "role", ROLES) as Role;
  assertCanManageRole(user.role, role);
  const password = req(fd, "password", "Le mot de passe provisoire");
  if (password.length < 10) throw new UserError("10 caractères minimum.", { cause: "password" });
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (exists) throw new UserError("Un compte existe déjà avec cet e-mail.", { cause: "email" });
  const fullName = req(fd, "fullName", "Le nom");
  const phone = str(fd, "phone");
  const [created] = await db
    .insert(schema.users)
    .values({ email, fullName, phone, role, accountType: oneOf(fd, "accountType", ACCOUNT_TYPES, "particulier"), companyName: str(fd, "companyName"), passwordHash: await hashPassword(password) })
    .returning({ id: schema.users.id });
  if (role === "chauffeur") {
    const [d] = await db.select({ id: schema.drivers.id, userId: schema.drivers.userId }).from(schema.drivers).where(eq(schema.drivers.email, email)).limit(1);
    if (d && !d.userId) await db.update(schema.drivers).set({ userId: created.id }).where(eq(schema.drivers.id, d.id));
    else if (!d) await db.insert(schema.drivers).values({ userId: created.id, fullName, phone, email });
  }
  if (role === "proprietaire") {
    const [o] = await db.select({ id: schema.owners.id, userId: schema.owners.userId }).from(schema.owners).where(eq(schema.owners.email, email)).limit(1);
    if (o && !o.userId) await db.update(schema.owners).set({ userId: created.id }).where(eq(schema.owners.id, o.id));
    else if (!o) await db.insert(schema.owners).values({ userId: created.id, fullName, phone, email });
  }
  if (role === "client") {
    const [c] = await db.select({ id: schema.customers.id, userId: schema.customers.userId }).from(schema.customers).where(eq(schema.customers.email, email)).limit(1);
    // Création par l'équipe : l'identité est vérifiée, on peut rattacher la fiche CRM existante.
    if (c && !c.userId) await db.update(schema.customers).set({ userId: created.id }).where(eq(schema.customers.id, c.id));
  }
  if (bool(fd, "sendEmail"))
    await queueEmail(
      email,
      "Votre accès SENTRAJET PREMIUM",
      emailLayout("Votre compte a été créé", [
        `Bonjour ${fullName},`,
        "Un compte vient d'être créé pour vous sur la plateforme SENTRAJET PREMIUM.",
        `Identifiant : <strong>${email}</strong>. Votre mot de passe provisoire vous est communiqué séparément ; modifiez-le dès votre première connexion.`,
      ], { label: "Se connecter", url: `${SITE_URL}/connexion` }),
    );
  await audit(user.id, "user.create", "user", created.id, { role });
  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: "Compte créé." };
});

export const updateUser = adminAction("users.manage", async (user, fd) => {
  const db = await getDb();
  const id = req(fd, "id", "L'utilisateur");
  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!target) throw new UserError("Utilisateur introuvable.");
  const role = oneOf(fd, "role", ROLES) as Role;
  const status = str(fd, "status") === "suspendu" ? "suspendu" : "actif";
  assertCanManageRole(user.role, target.role as Role);
  assertCanManageRole(user.role, role);
  if (target.id === user.id && (role !== target.role || status !== "actif")) throw new UserError("Vous ne pouvez pas modifier votre propre rôle ni suspendre votre compte.", { cause: "role" });
  if (target.role === "super_admin" && (role !== "super_admin" || status !== "actif")) {
    const others = await db.$count(schema.users, and(eq(schema.users.role, "super_admin"), eq(schema.users.status, "actif"), ne(schema.users.id, target.id)));
    if (others === 0) throw new UserError("Il doit rester au moins un super administrateur actif.", { cause: "role" });
  }
  await db.update(schema.users).set({ role, status, updatedAt: new Date() }).where(eq(schema.users.id, id));
  if (status === "suspendu" || role !== target.role) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  await audit(user.id, "user.update", "user", id, { from: { role: target.role, status: target.status }, to: { role, status } });
  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: "Compte mis à jour." };
});

export const resetUserPassword = adminAction("users.manage", async (user, fd) => {
  const db = await getDb();
  const id = req(fd, "id", "L'utilisateur");
  const password = req(fd, "password", "Le nouveau mot de passe");
  if (password.length < 10) throw new UserError("10 caractères minimum.", { cause: "password" });
  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!target) throw new UserError("Utilisateur introuvable.");
  assertCanManageRole(user.role, target.role as Role);
  await db.update(schema.users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(schema.users.id, id));
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, id), gt(schema.sessions.expiresAt, new Date(0))));
  await audit(user.id, "user.reset_password", "user", id);
  return { ok: true, message: "Mot de passe réinitialisé. Communiquez-le à l'utilisateur par un canal sûr." };
});

export const retryEmail = buttonAction("settings.manage", async (user, fd) => {
  const id = String(fd.get("id"));
  await sendQueuedEmail(id);
  await audit(user.id, "email.retry", "email", id);
  revalidatePath("/admin/parametres");
  return { ok: true, message: "Nouvel envoi tenté." };
});

