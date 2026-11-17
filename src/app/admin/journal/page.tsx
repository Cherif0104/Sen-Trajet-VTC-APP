import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { DataTable, EmptyState, FilterBar, PageHeader, Pagination } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { pageOf, qOf } from "@/server/queries/admin";
import { fdatetime } from "@/lib/format";

export const metadata = { title: "Journal d'audit" };

const SIZE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/journal">) {
  await requirePermission("audit.view");
  const sp = await searchParams;
  const q = qOf(sp);
  const page = pageOf(sp);
  const db = await getDb();
  const conds: SQL[] = [];
  if (q) conds.push(ilike(schema.auditLogs.action, `%${q}%`));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select({ a: schema.auditLogs, name: schema.users.fullName, email: schema.users.email })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
      .where(where)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(SIZE)
      .offset((page - 1) * SIZE),
    db.$count(schema.auditLogs, where),
  ]);
  return (
    <>
      <PageHeader title="Journal d'audit" description="Toutes les actions sensibles : connexions, modifications, exports, changements de statut." />
      <FilterBar action="/admin/journal" q={q} placeholder="Action (ex. invoice, user, login)…" />
      <DataTable
        columns={[
          { key: "d", label: "Date" },
          { key: "u", label: "Utilisateur" },
          { key: "a", label: "Action" },
          { key: "e", label: "Objet" },
          { key: "ip", label: "IP" },
        ]}
        rows={rows.map(({ a, name, email }) => ({
          key: a.id,
          cells: {
            d: <span className="text-xs whitespace-nowrap">{fdatetime(a.createdAt)}</span>,
            u: name ? (
              <span className="text-xs">
                {name}
                <span className="block text-muted-foreground">{email}</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Système / visiteur</span>
            ),
            a: <span className="whitespace-nowrap font-mono text-xs">{a.action}</span>,
            e: (
              <span className="text-xs text-muted-foreground">
                {a.entityType}
                {a.details ? <span className="block max-w-xs truncate font-mono">{JSON.stringify(a.details)}</span> : null}
              </span>
            ),
            ip: <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">{a.ip ?? "—"}</span>,
          },
        }))}
        empty={<EmptyState title="Aucune entrée" />}
      />
      <Pagination page={page} pageCount={Math.ceil(total / SIZE)} makeHref={(p) => `/admin/journal?${new URLSearchParams({ q, page: String(p) })}`} />
    </>
  );
}
