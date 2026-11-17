import "server-only";
import { headers } from "next/headers";
import { eq, inArray, sql } from "drizzle-orm";
import { getDb, schema, type DB } from "./db";
import { sendQueuedEmail } from "./email";
import type { Role } from "@/lib/domain";
import { can, type Permission } from "@/lib/permissions";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Conn = DB | Tx;

const PREFIX: Record<string, string> = {
  request: "STP",
  quote: "DEV",
  invoice: "FAC",
  mission: "MIS",
  contract: "CTR",
  submission: "PRO",
};

export async function nextReference(conn: Conn, key: keyof typeof PREFIX): Promise<string> {
  const year = new Date().getFullYear();
  const [row] = await conn
    .insert(schema.counters)
    .values({ key, year, value: 1 })
    .onConflictDoUpdate({
      target: [schema.counters.key, schema.counters.year],
      set: { value: sql`${schema.counters.value} + 1` },
    })
    .returning({ value: schema.counters.value });
  return `${PREFIX[key]}-${year}-${String(row.value).padStart(5, "0")}`;
}

export async function audit(
  userId: string | null,
  action: string,
  entityType?: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
) {
  const db = await getDb();
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {}
  await db.insert(schema.auditLogs).values({
    userId,
    action,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    details: details ?? null,
    ip,
  });
}

export async function notifyUser(conn: Conn, userId: string | null | undefined, title: string, body?: string, link?: string) {
  if (!userId) return;
  await conn.insert(schema.notifications).values({ userId, title, body: body ?? null, link: link ?? null });
}

/** Notifie toutes les personnes de l'équipe qui disposent de la permission donnée. */
export async function notifyStaff(conn: Conn, permission: Permission, title: string, body?: string, link?: string) {
  const roles = (["super_admin", "admin", "commercial", "flotte", "financier"] as Role[]).filter((r) => can(r, permission));
  const staff = await conn
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(inArray(schema.users.role, roles));
  if (staff.length === 0) return;
  await conn
    .insert(schema.notifications)
    .values(staff.map((s) => ({ userId: s.id, title, body: body ?? null, link: link ?? null })));
}

export async function queueEmail(to: string, subject: string, html: string) {
  const db = await getDb();
  const [row] = await db.insert(schema.emailOutbox).values({ to, subject, html }).returning({ id: schema.emailOutbox.id });
  await sendQueuedEmail(row.id).catch(() => {});
}

export async function adminEmails(): Promise<string[]> {
  const db = await getDb();
  const configured = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (configured) return configured.split(",").map((s) => s.trim()).filter(Boolean);
  const rows = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(inArray(schema.users.role, ["super_admin", "admin"]));
  return rows.map((r) => r.email);
}

export async function linkCustomer(
  conn: Conn,
  input: {
    userId?: string | null;
    fullName: string;
    email: string;
    phone: string;
    type: string;
    companyName?: string | null;
    city?: string | null;
  },
): Promise<string> {
  const email = input.email.toLowerCase();
  const existing = input.userId
    ? await conn.select().from(schema.customers).where(eq(schema.customers.userId, input.userId)).limit(1)
    : await conn.select().from(schema.customers).where(eq(schema.customers.email, email)).limit(1);
  if (existing[0]) {
    const c = existing[0];
    await conn
      .update(schema.customers)
      .set({
        phone: c.phone ?? input.phone,
        companyName: c.companyName ?? input.companyName ?? null,
        userId: c.userId ?? input.userId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, c.id));
    return c.id;
  }
  const [created] = await conn
    .insert(schema.customers)
    .values({
      userId: input.userId ?? null,
      fullName: input.fullName,
      email,
      phone: input.phone,
      type: input.type,
      companyName: input.companyName ?? null,
      city: input.city ?? null,
      source: input.userId ? "espace_client" : "site",
    })
    .returning({ id: schema.customers.id });
  return created.id;
}

export { computeTotals } from "@/lib/totals";
