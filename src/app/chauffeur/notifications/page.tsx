import { NotificationsPage } from "@/components/app/notifications-page";
import { requireRole } from "@/server/auth";

export const metadata = { title: "Notifications" };

export default async function DriverNotifications() {
  const user = await requireRole("chauffeur");
  return <NotificationsPage userId={user.id} />;
}
