import Link from "next/link";
import { BellRing } from "lucide-react";
import { EmptyState, PageHeader } from "./ui";
import { markAllNotificationsRead } from "@/server/actions/account";
import { myNotifications } from "@/server/queries/client";
import { fdatetime } from "@/lib/format";
import { cn } from "@/lib/utils";

export async function NotificationsPage({ userId }: { userId: string }) {
  const items = await myNotifications(userId);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}` : "Vous êtes à jour."}
        actions={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <button type="submit" className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-medium hover:border-ink">
                Tout marquer comme lu
              </button>
            </form>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState title="Aucune notification" text="Les mises à jour de vos dossiers apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {items.map((n) => {
            const body = (
              <div className="flex gap-3 px-5 py-4">
                <BellRing className={cn("mt-0.5 size-4 shrink-0", n.readAt ? "text-muted-foreground" : "text-gold")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{fdatetime(n.createdAt)}</p>
                </div>
                {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" aria-label="Non lue" />}
              </div>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-accent/40">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </>
  );
}
