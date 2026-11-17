import { NotificationsPage } from "@/components/app/notifications-page";
import { requireRole } from "@/server/auth";

export const metadata = { title: "Notifications" };

export default async function ClientNotifications() {
  const user = await requireRole("client");
  return <NotificationsPage userId={user.id} />;
}
