import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { DataTable, EmptyState, FilterBar, FilterSelect, PageHeader, Pagination, StatusBadge } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { PAGE_SIZE, pageOf, qOf } from "@/server/queries/admin";
import { REQUEST_STATUSES, SERVICE_OPTIONS, serviceLabel } from "@/lib/domain";
import { fdate, fdatetime } from "@/lib/format";

export const metadata = { title: "Demandes & réservations" };

const KINDS = [
  { value: "reservation", label: "Réservations" },
  { value: "devis", label: "Demandes de devis" },
];

export default async function AdminRequests({ searchParams }: PageProps<"/admin/demandes">) {
  await requirePermission("requests.manage");
  const sp = await searchParams;
  const q = qOf(sp);
  const status = qOf(sp, "status");
  const kind = qOf(sp, "kind");
  const service = qOf(sp, "service");
  const page = pageOf(sp);
  const db = await getDb();

  const conds: SQL[] = [];
  if (status) conds.push(eq(schema.requests.status, status));
  if (kind) conds.push(eq(schema.requests.kind, kind));
  if (service) conds.push(eq(schema.requests.serviceType, service));
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        ilike(schema.requests.reference, like),
        ilike(schema.requests.contactName, like),
        ilike(schema.requests.email, like),
        ilike(schema.requests.phone, like),
        ilike(schema.requests.companyName, like),
      )!,
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(schema.requests)
      .where(where)
      .orderBy(desc(schema.requests.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.$count(schema.requests, where),
  ]);
  const params = new URLSearchParams(Object.entries({ q, status, kind, service }).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <PageHeader title="Demandes & réservations" description={`${total} demande(s)`} />
      <FilterBar action="/admin/demandes" q={q} placeholder="Référence, nom, e-mail, téléphone, entreprise…">
        <FilterSelect name="status" value={status} options={REQUEST_STATUSES} placeholder="Tous les statuts" />
        <FilterSelect name="kind" value={kind} options={KINDS} placeholder="Tous les types" />
        <FilterSelect name="service" value={service} options={SERVICE_OPTIONS} placeholder="Toutes les prestations" />
      </FilterBar>
      <DataTable
        columns={[
          { key: "ref", label: "Référence" },
          { key: "client", label: "Client" },
          { key: "service", label: "Prestation" },
          { key: "date", label: "Date souhaitée" },
          { key: "status", label: "Statut" },
          { key: "created", label: "Reçue le", className: "text-right" },
        ]}
        rows={rows.map((r) => ({
          key: r.id,
          href: `/admin/demandes/${r.id}`,
          cells: {
            ref: <span className="font-mono text-xs">{r.reference}</span>,
            client: (
              <span>
                <span className="block font-medium">{r.contactName}</span>
                <span className="text-xs text-muted-foreground">{r.companyName ?? r.phone}</span>
              </span>
            ),
            service: (
              <span>
                {serviceLabel(r.serviceType)}
                <span className="block text-xs text-muted-foreground">{r.kind === "reservation" ? "Réservation" : "Devis"}</span>
              </span>
            ),
            date: r.startDate ? `${fdate(r.startDate)}${r.startTime ? ` · ${r.startTime}` : ""}` : "—",
            status: <StatusBadge list={REQUEST_STATUSES} value={r.status} />,
            created: <span className="text-xs text-muted-foreground">{fdatetime(r.createdAt)}</span>,
          },
        }))}
        empty={<EmptyState title="Aucune demande" text={q || status || kind || service ? "Aucun résultat pour ces filtres." : "Les demandes envoyées depuis le site apparaîtront ici."} />}
      />
      <Pagination
        page={page}
        pageCount={Math.ceil(total / PAGE_SIZE)}
        makeHref={(p) => {
          const u = new URLSearchParams(params);
          u.set("page", String(p));
          return `/admin/demandes?${u}`;
        }}
      />
    </>
  );
}
