"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "../auth";
import { adminEmails, audit, linkCustomer, nextReference, notifyStaff, queueEmail } from "../core";
import { emailLayout } from "../email";
import { fail, zodErrors, type ActionState } from "@/lib/action-state";
import { ACCOUNT_TYPES, SERVICE_OPTIONS, serviceLabel } from "@/lib/domain";
import { homeFor } from "@/lib/permissions";
import { SITE_URL } from "@/lib/site";

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .transform((v) => v || null)
    .nullable()
    .optional();

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Numéro de téléphone invalide")
  .max(25, "Numéro de téléphone invalide")
  .regex(/^[+\d][\d\s.-]+$/, "Numéro de téléphone invalide");

const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(160);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
  .optional()
  .or(z.literal("").transform(() => undefined));

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Heure invalide")
  .optional()
  .or(z.literal("").transform(() => undefined));

const requestSchema = z
  .object({
    kind: z.enum(["reservation", "devis"]),
    serviceType: z.enum(SERVICE_OPTIONS.map((s) => s.value) as [string, ...string[]], { message: "Choisissez un type de prestation" }),
    categoryId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    vehicleId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
    startDate: dateSchema,
    startTime: timeSchema,
    endDate: dateSchema,
    endTime: timeSchema,
    pickup: optionalText(200),
    destination: optionalText(200),
    passengers: z.coerce.number().int().min(1, "Au moins 1 passager").max(80, "80 passagers maximum").optional().or(z.literal("").transform(() => undefined)),
    duration: optionalText(80),
    withDriver: z.boolean(),
    details: optionalText(2000),
    contactName: z.string().trim().min(2, "Indiquez votre nom").max(120),
    email: emailSchema,
    phone: phoneSchema,
    accountType: z.enum(ACCOUNT_TYPES.map((a) => a.value) as [string, ...string[]]),
    companyName: optionalText(160),
    companyRole: optionalText(120),
    billingInfo: optionalText(500),
    consent: z.literal(true, { message: "Votre accord est nécessaire pour traiter la demande" }),
  })
  .superRefine((d, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (d.kind === "reservation") {
      if (!d.startDate) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Indiquez la date de début" });
      if (!d.pickup) ctx.addIssue({ code: "custom", path: ["pickup"], message: "Indiquez le lieu de prise en charge" });
    }
    if (d.startDate && d.startDate < today) ctx.addIssue({ code: "custom", path: ["startDate"], message: "La date ne peut pas être passée" });
    if (d.startDate && d.endDate && d.endDate < d.startDate)
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "La date de fin doit suivre la date de début" });
    if (d.accountType !== "particulier" && !d.companyName)
      ctx.addIssue({ code: "custom", path: ["companyName"], message: "Indiquez le nom de la structure" });
  });

export async function submitRequest(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (fd.get("website")) return { ok: true, message: "Merci." };
  const user = await getCurrentUser();
  const parsed = requestSchema.safeParse({
    kind: fd.get("kind") === "devis" ? "devis" : "reservation",
    serviceType: fd.get("serviceType") ?? "",
    categoryId: fd.get("categoryId") ?? "",
    vehicleId: fd.get("vehicleId") ?? "",
    startDate: fd.get("startDate") ?? "",
    startTime: fd.get("startTime") ?? "",
    endDate: fd.get("endDate") ?? "",
    endTime: fd.get("endTime") ?? "",
    pickup: fd.get("pickup") ?? "",
    destination: fd.get("destination") ?? "",
    passengers: fd.get("passengers") ?? "",
    duration: fd.get("duration") ?? "",
    withDriver: fd.get("withDriver") !== "non",
    details: fd.get("details") ?? "",
    contactName: fd.get("contactName") ?? "",
    email: fd.get("email") ?? "",
    phone: fd.get("phone") ?? "",
    accountType: fd.get("accountType") || "particulier",
    companyName: fd.get("companyName") ?? "",
    companyRole: fd.get("companyRole") ?? "",
    billingInfo: fd.get("billingInfo") ?? "",
    consent: fd.get("consent") === "on",
  });
  if (!parsed.success) return fail(fd, "Certains champs sont à corriger.", zodErrors(parsed.error));
  const d = parsed.data;
  const db = await getDb();

  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(schema.requests)
    .where(and(eq(schema.requests.email, d.email), gt(schema.requests.createdAt, new Date(Date.now() - 15 * 60_000))));
  if (recent >= 5) return fail(fd, "Vous avez déjà envoyé plusieurs demandes. Patientez quelques minutes ou contactez-nous par téléphone.");

  let vehicleName: string | null = null;
  if (d.vehicleId) {
    const [v] = await db
      .select({ brand: schema.vehicles.brand, model: schema.vehicles.model, categoryId: schema.vehicles.categoryId })
      .from(schema.vehicles)
      .where(and(eq(schema.vehicles.id, d.vehicleId), eq(schema.vehicles.publicationStatus, "publie")))
      .limit(1);
    if (!v) return fail(fd, "Le véhicule choisi n'est plus proposé.", { vehicleId: "Véhicule indisponible" });
    vehicleName = `${v.brand} ${v.model}`;
    d.categoryId ??= v.categoryId ?? undefined;
  }

  const created = await db.transaction(async (tx) => {
    const reference = await nextReference(tx, "request");
    const customerId = await linkCustomer(tx, {
      userId: user?.role === "client" ? user.id : null,
      fullName: d.contactName,
      email: d.email,
      phone: d.phone,
      type: d.accountType,
      companyName: d.companyName,
    });
    const [row] = await tx
      .insert(schema.requests)
      .values({
        reference,
        kind: d.kind,
        serviceType: d.serviceType,
        categoryId: d.categoryId ?? null,
        vehicleId: d.vehicleId ?? null,
        startDate: d.startDate ?? null,
        startTime: d.startTime ?? null,
        endDate: d.endDate ?? null,
        endTime: d.endTime ?? null,
        pickup: d.pickup ?? null,
        destination: d.destination ?? null,
        passengers: typeof d.passengers === "number" ? d.passengers : null,
        duration: d.duration ?? null,
        withDriver: d.withDriver,
        details: d.details ?? null,
        contactName: d.contactName,
        email: d.email,
        phone: d.phone,
        accountType: d.accountType,
        companyName: d.companyName ?? null,
        companyRole: d.companyRole ?? null,
        billingInfo: d.billingInfo ?? null,
        customerId,
        userId: user?.role === "client" ? user.id : null,
        status: "nouvelle",
      })
      .returning({ id: schema.requests.id, reference: schema.requests.reference });
    await tx.insert(schema.requestHistory).values({
      requestId: row.id,
      toStatus: "nouvelle",
      note: d.kind === "devis" ? "Demande de devis envoyée en ligne" : "Demande de réservation envoyée en ligne",
      byUserId: user?.id ?? null,
    });
    await notifyStaff(
      tx,
      "requests.manage",
      `Nouvelle ${d.kind === "devis" ? "demande de devis" : "demande de réservation"} ${reference}`,
      `${d.contactName} — ${serviceLabel(d.serviceType)}`,
      `/admin/demandes/${row.id}`,
    );
    return row;
  });

  const label = d.kind === "devis" ? "demande de devis" : "demande de réservation";
  await queueEmail(
    d.email,
    `SENTRAJET PREMIUM — ${label} ${created.reference} bien reçue`,
    emailLayout(`Votre ${label} est bien reçue`, [
      `Bonjour ${d.contactName},`,
      `Nous avons bien reçu votre ${label} (référence ${created.reference}) pour la prestation « ${serviceLabel(d.serviceType)} »${vehicleName ? ` avec le véhicule ${vehicleName}` : ""}.`,
      "Notre équipe vérifie la disponibilité et revient vers vous rapidement. Votre demande n'est pas encore une réservation confirmée.",
      "Conservez cette référence pour tout échange avec nous.",
    ], user ? { label: "Suivre ma demande", url: `${SITE_URL}/espace/demandes` } : undefined),
  ).catch(() => {});
  const admins = await adminEmails();
  if (admins.length) {
    await queueEmail(
      admins.join(","),
      `Nouvelle ${label} ${created.reference}`,
      emailLayout(`Nouvelle ${label}`, [
        `Référence : ${created.reference}`,
        `Client : ${d.contactName} (${d.email}, ${d.phone})${d.companyName ? ` — ${d.companyName}` : ""}`,
        `Prestation : ${serviceLabel(d.serviceType)}${vehicleName ? ` — ${vehicleName}` : ""}`,
        `Date : ${d.startDate ?? "à préciser"} ${d.startTime ?? ""} · Départ : ${d.pickup ?? "à préciser"} · Destination : ${d.destination ?? "—"}`,
      ], { label: "Ouvrir dans le back-office", url: `${SITE_URL}/admin/demandes/${created.id}` }),
    ).catch(() => {});
  }
  await audit(user?.id ?? null, "request.create", "request", created.id, { reference: created.reference, kind: d.kind });
  redirect(`/reservation/confirmation?ref=${encodeURIComponent(created.reference)}`);
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom").max(120),
  email: emailSchema,
  phone: z.string().trim().max(25).optional(),
  subject: z.string().trim().min(3, "Indiquez un objet").max(160),
  body: z.string().trim().min(10, "Votre message est trop court").max(4000),
});

export async function submitContact(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (fd.get("website")) return { ok: true, message: "Merci, votre message a bien été envoyé." };
  const parsed = contactSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(fd, "Certains champs sont à corriger.", zodErrors(parsed.error));
  const d = parsed.data;
  const db = await getDb();
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(schema.messages)
    .where(and(eq(schema.messages.email, d.email), gt(schema.messages.createdAt, new Date(Date.now() - 10 * 60_000))));
  if (recent >= 3) return fail(fd, "Plusieurs messages ont déjà été envoyés. Merci de patienter quelques minutes.");
  const user = await getCurrentUser();
  const [msg] = await db
    .insert(schema.messages)
    .values({ name: d.name, email: d.email, phone: d.phone || null, subject: d.subject, body: d.body, userId: user?.id ?? null })
    .returning({ id: schema.messages.id });
  await notifyStaff(db, "messages.manage", `Nouveau message : ${d.subject}`, d.name, `/admin/messages`);
  const admins = await adminEmails();
  if (admins.length)
    await queueEmail(admins.join(","), `Nouveau message — ${d.subject}`, emailLayout("Nouveau message reçu", [`De : ${d.name} (${d.email}${d.phone ? `, ${d.phone}` : ""})`, d.body])).catch(() => {});
  await audit(user?.id ?? null, "message.create", "message", msg.id);
  return { ok: true, message: "Merci, votre message a bien été envoyé. Nous vous répondons rapidement." };
}

const registerSchema = z
  .object({
    profile: z.enum(["client", "proprietaire"]),
    fullName: z.string().trim().min(2, "Indiquez votre nom complet").max(120),
    email: emailSchema,
    phone: phoneSchema,
    accountType: z.enum(ACCOUNT_TYPES.map((a) => a.value) as [string, ...string[]]),
    companyName: optionalText(160),
    jobTitle: optionalText(120),
    city: optionalText(80),
    password: z.string().min(8, "8 caractères minimum").max(200),
    confirm: z.string(),
    consent: z.literal(true, { message: "Vous devez accepter les conditions" }),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.confirm) ctx.addIssue({ code: "custom", path: ["confirm"], message: "Les mots de passe ne correspondent pas" });
    if (d.accountType !== "particulier" && !d.companyName) ctx.addIssue({ code: "custom", path: ["companyName"], message: "Indiquez le nom de la structure" });
  });

export async function register(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (fd.get("website")) return { ok: false, message: "Inscription impossible." };
  const parsed = registerSchema.safeParse({
    profile: fd.get("profile") === "proprietaire" ? "proprietaire" : "client",
    fullName: fd.get("fullName") ?? "",
    email: fd.get("email") ?? "",
    phone: fd.get("phone") ?? "",
    accountType: fd.get("accountType") || "particulier",
    companyName: fd.get("companyName") ?? "",
    jobTitle: fd.get("jobTitle") ?? "",
    city: fd.get("city") ?? "",
    password: fd.get("password") ?? "",
    confirm: fd.get("confirm") ?? "",
    consent: fd.get("consent") === "on",
  });
  if (!parsed.success) return fail(fd, "Certains champs sont à corriger.", zodErrors(parsed.error));
  const d = parsed.data;
  const db = await getDb();
  const exists = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, d.email)).limit(1);
  if (exists[0]) return fail(fd, "Un compte existe déjà avec cette adresse e-mail.", { email: "Adresse déjà utilisée — connectez-vous" });

  const userId = await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(schema.users)
      .values({
        email: d.email,
        passwordHash: await hashPassword(d.password),
        fullName: d.fullName,
        phone: d.phone,
        role: d.profile,
        accountType: d.accountType,
        companyName: d.companyName ?? null,
        jobTitle: d.jobTitle ?? null,
        city: d.city ?? null,
      })
      .returning({ id: schema.users.id });
    if (d.profile === "client") {
      const customerId = await linkCustomer(tx, {
        userId: u.id,
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        type: d.accountType,
        companyName: d.companyName,
        city: d.city,
      });
      await notifyStaff(tx, "customers.manage", "Nouveau compte client", `${d.fullName}${d.companyName ? ` — ${d.companyName}` : ""}`, `/admin/clients/${customerId}`);
    } else {
      const [o] = await tx
        .insert(schema.owners)
        .values({ userId: u.id, fullName: d.fullName, email: d.email, phone: d.phone, companyName: d.companyName ?? null, city: d.city ?? null, status: "prospect" })
        .returning({ id: schema.owners.id });
      await notifyStaff(tx, "owners.manage", "Nouveau propriétaire inscrit", d.fullName, `/admin/proprietaires/${o.id}`);
    }
    return u.id;
  });
  await createSession(userId);
  await audit(userId, "auth.register", "user", userId, { profile: d.profile });
  await queueEmail(
    d.email,
    "Bienvenue chez SENTRAJET PREMIUM",
    emailLayout("Votre compte est créé", [
      `Bonjour ${d.fullName},`,
      d.profile === "proprietaire"
        ? "Votre espace propriétaire est prêt. Vous pouvez dès maintenant soumettre votre véhicule et ses documents pour étude."
        : "Votre espace client est prêt. Vous pouvez y suivre vos demandes, devis, réservations et factures.",
    ], { label: "Accéder à mon espace", url: `${SITE_URL}${d.profile === "proprietaire" ? "/proprietaire" : "/espace"}` }),
  ).catch(() => {});
  redirect(d.profile === "proprietaire" ? "/proprietaire/vehicules/nouveau" : "/espace");
}

const attempts = new Map<string, { n: number; at: number }>();

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "");
  if (!email || !password) return fail(fd, "Saisissez votre e-mail et votre mot de passe.");
  const a = attempts.get(email);
  if (a && a.n >= 8 && Date.now() - a.at < 15 * 60_000) return fail(fd, "Trop de tentatives. Réessayez dans quelques minutes.");

  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  const valid = u ? await verifyPassword(password, u.passwordHash) : false;
  if (!u || !valid) {
    attempts.set(email, { n: (a?.n ?? 0) + 1, at: Date.now() });
    await audit(u?.id ?? null, "auth.login_failed", "user", u?.id ?? null, { email });
    return fail(fd, "E-mail ou mot de passe incorrect.");
  }
  if (u.status !== "actif") return fail(fd, "Ce compte est suspendu. Contactez SENTRAJET PREMIUM.");
  attempts.delete(email);
  await createSession(u.id);
  await audit(u.id, "auth.login", "user", u.id);
  const home = homeFor(u.role);
  const safeNext = next.startsWith("/") && !next.startsWith("//") && next.startsWith(home) ? next : home;
  redirect(safeNext);
}

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "auth.logout", "user", user.id);
  redirect("/connexion");
}
