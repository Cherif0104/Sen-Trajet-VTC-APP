import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import { getDb, schema } from "../db";

const monthKey = (d: Date) => d.toISOString().slice(0, 7);
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return { key: monthKey(d), label: `${MONTHS[d.getUTCMonth()]}` };
  });
}

export async function dashboardData() {
  const db = await getDb();
  const months = lastMonths(6);
  const since = `${months[0].key}-01`;
  const today = new Date().toISOString().slice(0, 10);
  const in15 = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const monthStart = `${months[5].key}-01`;

  const [
    newRequests,
    openRequests,
    upcomingMissions,
    vehiclesOps,
    vehiclesMaint,
    pendingSubs,
    unreadMsgs,
    reqRows,
    payRows,
    expRows,
    unpaid,
    monthIn,
    latest,
    maint,
    docs,
    nextMissions,
  ] = await Promise.all([
    db.$count(schema.requests, eq(schema.requests.status, "nouvelle")),
    db.$count(schema.requests, inArray(schema.requests.status, ["en_attente", "verification", "devis_envoye", "attente_client"])),
    db.$count(schema.missions, and(eq(schema.missions.status, "planifiee"), gte(schema.missions.startAt, new Date()))),
    db.$count(schema.vehicles, and(eq(schema.vehicles.technicalStatus, "operationnel"), ne(schema.vehicles.publicationStatus, "archive"))),
    db.$count(schema.vehicles, inArray(schema.vehicles.technicalStatus, ["en_maintenance", "immobilise", "a_inspecter"])),
    db.$count(schema.ownerSubmissions, inArray(schema.ownerSubmissions.status, ["soumis", "en_revue", "inspection"])),
    db.$count(schema.messages, eq(schema.messages.status, "nouveau")),
    db.select({ createdAt: schema.requests.createdAt, kind: schema.requests.kind }).from(schema.requests).where(gte(schema.requests.createdAt, new Date(since))),
    db.select({ amount: schema.payments.amount, paidAt: schema.payments.paidAt, direction: schema.payments.direction }).from(schema.payments).where(gte(schema.payments.paidAt, since)),
    db.select({ amount: schema.expenses.amountTtc, spentAt: schema.expenses.spentAt }).from(schema.expenses).where(gte(schema.expenses.spentAt, since)),
    db
      .select({ due: sql<number>`coalesce(sum(${schema.invoices.total} - ${schema.invoices.amountPaid}), 0)::int`, n: sql<number>`count(*)::int` })
      .from(schema.invoices)
      .where(inArray(schema.invoices.status, ["emise", "partielle"])),
    db
      .select({ s: sql<number>`coalesce(sum(${schema.payments.amount}), 0)::int` })
      .from(schema.payments)
      .where(and(eq(schema.payments.direction, "encaissement"), gte(schema.payments.paidAt, monthStart))),
    db
      .select({ id: schema.requests.id, reference: schema.requests.reference, contactName: schema.requests.contactName, serviceType: schema.requests.serviceType, status: schema.requests.status, createdAt: schema.requests.createdAt, companyName: schema.requests.companyName })
      .from(schema.requests)
      .orderBy(desc(schema.requests.createdAt))
      .limit(6),
    db
      .select({ id: schema.maintenance.id, type: schema.maintenance.type, scheduledDate: schema.maintenance.scheduledDate, brand: schema.vehicles.brand, model: schema.vehicles.model, plate: schema.vehicles.plate })
      .from(schema.maintenance)
      .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.maintenance.vehicleId))
      .where(and(inArray(schema.maintenance.status, ["planifie", "en_cours"]), isNotNull(schema.maintenance.scheduledDate), lte(schema.maintenance.scheduledDate, in15)))
      .orderBy(asc(schema.maintenance.scheduledDate))
      .limit(8),
    db
      .select({ id: schema.documents.id, docType: schema.documents.docType, expiresAt: schema.documents.expiresAt, entityType: schema.documents.entityType, entityId: schema.documents.entityId })
      .from(schema.documents)
      .where(and(isNotNull(schema.documents.expiresAt), lte(schema.documents.expiresAt, in15), ne(schema.documents.status, "refuse")))
      .orderBy(asc(schema.documents.expiresAt))
      .limit(8),
    db
      .select({ id: schema.missions.id, reference: schema.missions.reference, startAt: schema.missions.startAt, pickup: schema.missions.pickup, destination: schema.missions.destination, driver: schema.drivers.fullName })
      .from(schema.missions)
      .leftJoin(schema.drivers, eq(schema.drivers.id, schema.missions.driverId))
      .where(and(inArray(schema.missions.status, ["planifiee", "en_cours"]), gte(schema.missions.startAt, new Date(Date.now() - 12 * 3600000))))
      .orderBy(asc(schema.missions.startAt))
      .limit(6),
  ]);

  const requestsByMonth = months.map((m) => ({
    month: m.label,
    reservations: reqRows.filter((r) => monthKey(r.createdAt) === m.key && r.kind === "reservation").length,
    devis: reqRows.filter((r) => monthKey(r.createdAt) === m.key && r.kind !== "reservation").length,
  }));
  const financeByMonth = months.map((m) => ({
    month: m.label,
    encaissements: payRows.filter((p) => p.direction === "encaissement" && p.paidAt.startsWith(m.key)).reduce((s, p) => s + p.amount, 0),
    sorties:
      payRows.filter((p) => p.direction === "decaissement" && p.paidAt.startsWith(m.key)).reduce((s, p) => s + p.amount, 0) +
      expRows.filter((e) => e.spentAt.startsWith(m.key)).reduce((s, e) => s + e.amount, 0),
  }));

  return {
    kpi: {
      newRequests,
      openRequests,
      upcomingMissions,
      vehiclesOps,
      vehiclesMaint,
      pendingSubs,
      unreadMsgs,
      unpaidAmount: unpaid[0]?.due ?? 0,
      unpaidCount: unpaid[0]?.n ?? 0,
      monthIn: monthIn[0]?.s ?? 0,
    },
    requestsByMonth,
    financeByMonth,
    latest,
    maint,
    docs,
    nextMissions,
    today,
  };
}

export async function staffOptions() {
  const db = await getDb();
  return db
    .select({ value: schema.users.id, label: schema.users.fullName })
    .from(schema.users)
    .where(and(inArray(schema.users.role, ["super_admin", "admin", "commercial", "flotte", "financier"]), eq(schema.users.status, "actif")))
    .orderBy(asc(schema.users.fullName));
}

export async function customerOptions() {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.customers.id, fullName: schema.customers.fullName, companyName: schema.customers.companyName, email: schema.customers.email })
    .from(schema.customers)
    .orderBy(asc(schema.customers.fullName))
    .limit(1000);
  return rows.map((r) => ({ value: r.id, label: [r.companyName, r.fullName, r.email].filter(Boolean).join(" · ") }));
}

export async function vehicleOptions(includeArchived = false) {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.vehicles.id, brand: schema.vehicles.brand, model: schema.vehicles.model, plate: schema.vehicles.plate, pub: schema.vehicles.publicationStatus })
    .from(schema.vehicles)
    .orderBy(asc(schema.vehicles.brand), asc(schema.vehicles.model));
  return rows
    .filter((r) => includeArchived || r.pub !== "archive")
    .map((r) => ({ value: r.id, label: `${r.brand} ${r.model}${r.plate ? ` · ${r.plate}` : ""}` }));
}

export async function driverOptions() {
  const db = await getDb();
  const rows = await db.select({ value: schema.drivers.id, label: schema.drivers.fullName, status: schema.drivers.status }).from(schema.drivers).orderBy(asc(schema.drivers.fullName));
  return rows.filter((r) => r.status !== "inactif").map(({ value, label }) => ({ value, label }));
}

export async function ownerOptions() {
  const db = await getDb();
  return db.select({ value: schema.owners.id, label: schema.owners.fullName }).from(schema.owners).orderBy(asc(schema.owners.fullName));
}

export const PAGE_SIZE = 25;
export const pageOf = (sp: Record<string, string | string[] | undefined>) => Math.max(1, Number(sp.page) || 1);
export const qOf = (sp: Record<string, string | string[] | undefined>, key = "q") => (typeof sp[key] === "string" ? (sp[key] as string).trim() : "");
