import { desc, eq } from "drizzle-orm";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { EmptyState, FilterBar, FilterSelect, PageHeader, StatusBadge } from "@/components/app/ui";
import { requirePermission } from "@/server/auth";
import { getDb, schema } from "@/server/db";
import { qOf } from "@/server/queries/admin";
import { setMessageStatus } from "@/server/actions/admin-crm";
import { MESSAGE_STATUSES } from "@/lib/domain";
import { fdatetime, telLink } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requirePermission("messages.manage");
  const sp = await searchParams;
  const status = qOf(sp, "status");
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.messages)
    .where(status ? eq(schema.messages.status, status) : undefined)
    .orderBy(desc(schema.messages.createdAt))
    .limit(200);
  return (
    <>
      <PageHeader title="Messages" description="Messages reçus via le formulaire de contact et l'espace client." />
      <FilterBar action="/admin/messages" placeholder="">
        <FilterSelect name="status" value={status} options={MESSAGE_STATUSES} placeholder="Tous" />
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState title="Aucun message" />
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className={`rounded-2xl border bg-white p-5 ${m.status === "nouveau" ? "border-gold/60" : "border-border"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{m.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.name} ·{" "}
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-gold hover:underline">
                      {m.email}
                    </a>
                    {m.phone && (
                      <>
                        {" · "}
                        <a href={telLink(m.phone)} className="text-gold hover:underline">
                          {m.phone}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {fdatetime(m.createdAt)} <StatusBadge list={MESSAGE_STATUSES} value={m.status} />
                </span>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line">{m.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {MESSAGE_STATUSES.filter((s) => s.value !== m.status && s.value !== "nouveau").map((s) => (
                  <ConfirmActionButton key={s.value} action={setMessageStatus} fields={{ id: m.id, status: s.value }} size="sm" variant="outline">
                    Marquer « {s.label} »
                  </ConfirmActionButton>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
