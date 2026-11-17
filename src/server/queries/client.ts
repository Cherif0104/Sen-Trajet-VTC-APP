import "server-only";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { CurrentUser } from "../auth";
import { OPEN_REQUEST_STATUSES, RESERVATION_STATUSES } from "@/lib/domain";

const { requests, quotes, invoices, customers, vehicles, categories, notifications } = schema;

export async function myCustomerIds(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId));
  return rows.map((r) => r.id);
}

function ownership(userId: string, customerIds: string[]) {
  return customerIds.length ? or(eq(requests.userId, userId), inArray(requests.customerId, customerIds))! : eq(requests.userId, userId);
}

export async function myRequests(user: CurrentUser, opts: { reservationsOnly?: boolean; limit?: number } = {}) {
  const db = await getDb();
  const ids = await myCustomerIds(user.id);
  return db
    .select({
      id: requests.id,
      reference: requests.reference,
      kind: requests.kind,
      serviceType: requests.serviceType,
      status: requests.status,
      startDate: requests.startDate,
      startTime: requests.startTime,
      pickup: requests.pickup,
      destination: requests.destination,
      createdAt: requests.createdAt,
      vehicleName: sql<string | null>`case when ${vehicles.id} is null then null else ${vehicles.brand} || ' ' || ${vehicles.model} end`,
      categoryName: categories.name,
    })
    .from(requests)
    .leftJoin(vehicles, eq(vehicles.id, requests.vehicleId))
    .leftJoin(categories, eq(categories.id, requests.categoryId))
    .where(and(ownership(user.id, ids), opts.reservationsOnly ? inArray(requests.status, RESERVATION_STATUSES) : undefined))
    .orderBy(desc(requests.createdAt))
    .limit(opts.limit ?? 200);
}

export async function myRequest(user: CurrentUser, id: string) {
  const db = await getDb();
  const ids = await myCustomerIds(user.id);
  const [row] = await db
    .select({ request: requests, vehicle: vehicles, category: categories })
    .from(requests)
    .leftJoin(vehicles, eq(vehicles.id, requests.vehicleId))
    .leftJoin(categories, eq(categories.id, requests.categoryId))
    .where(and(eq(requests.id, id), ownership(user.id, ids)))
    .limit(1);
  if (!row) return null;
  const [history, relatedQuotes, relatedInvoices] = await Promise.all([
    db.select().from(schema.requestHistory).where(eq(schema.requestHistory.requestId, id)).orderBy(desc(schema.requestHistory.createdAt)),
    db.select().from(quotes).where(and(eq(quotes.requestId, id), ne(quotes.status, "brouillon"))).orderBy(desc(quotes.createdAt)),
    db.select().from(invoices).where(and(eq(invoices.requestId, id), ne(invoices.status, "brouillon"))).orderBy(desc(invoices.createdAt)),
  ]);
  return { ...row, history, quotes: relatedQuotes, invoices: relatedInvoices };
}

export async function myQuotes(user: CurrentUser) {
  const db = await getDb();
  const ids = await myCustomerIds(user.id);
  if (!ids.length) return [];
  return db
    .select({ quote: quotes, reference: requests.reference })
    .from(quotes)
    .leftJoin(requests, eq(requests.id, quotes.requestId))
    .where(and(inArray(quotes.customerId, ids), ne(quotes.status, "brouillon")))
    .orderBy(desc(quotes.createdAt));
}

export async function myInvoices(user: CurrentUser) {
  const db = await getDb();
  const ids = await myCustomerIds(user.id);
  if (!ids.length) return [];
  return db
    .select({ invoice: invoices, reference: requests.reference })
    .from(invoices)
    .leftJoin(requests, eq(requests.id, invoices.requestId))
    .where(and(inArray(invoices.customerId, ids), ne(invoices.status, "brouillon")))
    .orderBy(desc(invoices.createdAt));
}

export async function myDashboard(user: CurrentUser) {
  const db = await getDb();
  const ids = await myCustomerIds(user.id);
  const own = ownership(user.id, ids);
  const today = new Date().toISOString().slice(0, 10);
  const [[open], [upcoming], [pendingQuotes], [unpaid]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(requests).where(and(own, inArray(requests.status, OPEN_REQUEST_STATUSES))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(requests)
      .where(and(own, inArray(requests.status, ["acceptee", "confirmee", "en_cours"]), or(isNull(requests.startDate), sql`${requests.startDate} >= ${today}`))),
    ids.length
      ? db.select({ n: sql<number>`count(*)::int` }).from(quotes).where(and(inArray(quotes.customerId, ids), eq(quotes.status, "envoye")))
      : Promise.resolve([{ n: 0 }]),
    ids.length
      ? db
          .select({ n: sql<number>`count(*)::int`, due: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)::int` })
          .from(invoices)
          .where(and(inArray(invoices.customerId, ids), inArray(invoices.status, ["emise", "partielle"])))
      : Promise.resolve([{ n: 0, due: 0 }]),
  ]);
  return { open: open.n, upcoming: upcoming.n, pendingQuotes: pendingQuotes.n, unpaid: unpaid as { n: number; due: number } };
}

export async function myNotifications(userId: string, limit = 100) {
  const db = await getDb();
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadCount(userId: string) {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r.n;
}
