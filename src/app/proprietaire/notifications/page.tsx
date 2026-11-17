import { NotificationsPage } from "@/components/app/notifications-page";
import { requireRole } from "@/server/auth";

export const metadata = { title: "Notifications" };

export default async function OwnerNotifications() {
  const user = await requireRole("proprietaire");
  return <NotificationsPage userId={user.id} />;
}
