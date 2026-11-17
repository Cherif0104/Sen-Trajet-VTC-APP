import "server-only";
import { and, asc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { getDb, schema } from "../db";

export type Period = { from: string; to: string };

export function periodOf(sp: Record<string, string | string[] | undefined>): Period {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const ok = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const from = ok(sp.from) ? (sp.from as string) : first;
  const to = ok(sp.to) ? (sp.to as string) : today;
  return from <= to ? { from, to } : { from: to, to: from };
}

export async function financeReport({ from, to }: Period) {
  const db = await getDb();
  const [invoices, payments, expenses] = await Promise.all([
    db
      .select({ i: schema.invoices, name: schema.customers.fullName, company: schema.customers.companyName })
      .from(schema.invoices)
      .leftJoin(schema.customers, eq(schema.customers.id, schema.invoices.customerId))
      .where(and(inArray(schema.invoices.status, ["emise", "partielle", "payee"]), gte(schema.invoices.issuedAt, from), lte(schema.invoices.issuedAt, to)))
      .orderBy(asc(schema.invoices.issuedAt)),
    db
      .select({ p: schema.payments, invoice: schema.invoices.number, owner: schema.owners.fullName })
      .from(schema.payments)
      .leftJoin(schema.invoices, eq(schema.invoices.id, schema.payments.invoiceId))
      .leftJoin(schema.owners, eq(schema.owners.id, schema.payments.ownerId))
      .where(and(gte(schema.payments.paidAt, from), lte(schema.payments.paidAt, to)))
      .orderBy(asc(schema.payments.paidAt)),
    db
      .select({ e: schema.expenses, brand: schema.vehicles.brand, model: schema.vehicles.model })
      .from(schema.expenses)
      .leftJoin(schema.vehicles, eq(schema.vehicles.id, schema.expenses.vehicleId))
      .where(and(gte(schema.expenses.spentAt, from), lte(schema.expenses.spentAt, to)))
      .orderBy(asc(schema.expenses.spentAt)),
  ]);
  const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
  const billedHt = sum(invoices, (r) => r.i.subtotal);
  const billedTax = sum(invoices, (r) => r.i.taxAmount);
  const billedTtc = sum(invoices, (r) => r.i.total);
  const cashIn = sum(payments.filter((r) => r.p.direction === "encaissement"), (r) => r.p.amount);
  const payouts = sum(payments.filter((r) => r.p.direction === "decaissement"), (r) => r.p.amount);
  const expHt = sum(expenses, (r) => r.e.amountHt);
  const expTax = sum(expenses, (r) => r.e.taxAmount);
  const expTtc = sum(expenses, (r) => r.e.amountTtc);
  const byCategory = new Map<string, number>();
  for (const r of expenses) byCategory.set(r.e.category, (byCategory.get(r.e.category) ?? 0) + r.e.amountTtc);
  return {
    invoices,
    payments,
    expenses,
    totals: { billedHt, billedTax, billedTtc, cashIn, payouts, expHt, expTax, expTtc, net: cashIn - payouts - expTtc, vatBalance: billedTax - expTax },
    byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
  };
}

export async function unpaidInvoices() {
  const db = await getDb();
  return db
    .select({ i: schema.invoices, name: schema.customers.fullName, company: schema.customers.companyName })
    .from(schema.invoices)
    .leftJoin(schema.customers, eq(schema.customers.id, schema.invoices.customerId))
    .where(and(inArray(schema.invoices.status, ["emise", "partielle"]), ne(schema.invoices.total, schema.invoices.amountPaid)))
    .orderBy(asc(schema.invoices.dueAt));
}
