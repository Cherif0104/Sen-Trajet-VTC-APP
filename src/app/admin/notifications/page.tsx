import { NotificationsPage } from "@/components/app/notifications-page";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "Notifications" };

export default async function AdminNotifications() {
  const user = await requirePermission("dashboard.view");
  return <NotificationsPage userId={user.id} />;
}
