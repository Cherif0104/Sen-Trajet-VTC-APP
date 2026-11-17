import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/server/auth";
import { logout } from "@/server/actions/public";
import { unreadCount } from "@/server/queries/client";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Espace chauffeur", robots: { index: false } };

export default async function DriverLayout({ children }: LayoutProps<"/chauffeur">) {
  const user = await requireRole("chauffeur");
  const [settings, unread] = await Promise.all([getSettings(), unreadCount(user.id)]);
  return (
    <AppShell
      spaceLabel="Espace chauffeur"
      logoUrl={settings.branding.logoUrl}
      logoutAction={logout}
      notificationsHref="/chauffeur/notifications"
      unread={unread}
      user={{ name: user.fullName, subtitle: "Chauffeur" }}
      sections={[
        {
          items: [
            { href: "/chauffeur", label: "Mes missions", icon: "missions", exact: true },
            { href: "/chauffeur/notifications", label: "Notifications", icon: "bell", badge: unread },
            { href: "/chauffeur/profil", label: "Mon profil", icon: "user" },
          ],
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
