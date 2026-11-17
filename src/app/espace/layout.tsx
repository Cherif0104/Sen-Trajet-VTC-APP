import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/server/auth";
import { logout } from "@/server/actions/public";
import { unreadCount } from "@/server/queries/client";
import { getSettings } from "@/server/settings";
import { accountTypeLabel } from "@/lib/domain";

export const metadata = { title: "Espace client", robots: { index: false } };

export default async function ClientLayout({ children }: LayoutProps<"/espace">) {
  const user = await requireRole("client");
  const [settings, unread] = await Promise.all([getSettings(), unreadCount(user.id)]);
  return (
    <AppShell
      spaceLabel="Espace client"
      logoUrl={settings.branding.logoUrl}
      logoutAction={logout}
      notificationsHref="/espace/notifications"
      unread={unread}
      user={{ name: user.fullName, subtitle: user.companyName ?? accountTypeLabel(user.accountType) }}
      sections={[
        {
          items: [
            { href: "/espace", label: "Tableau de bord", icon: "dashboard", exact: true },
            { href: "/espace/nouvelle-demande", label: "Nouvelle demande", icon: "plus" },
            { href: "/espace/demandes", label: "Mes demandes", icon: "requests" },
            { href: "/espace/reservations", label: "Mes réservations", icon: "reservations" },
            { href: "/espace/devis", label: "Mes devis", icon: "quotes" },
            { href: "/espace/factures", label: "Mes factures", icon: "invoices" },
          ],
        },
        {
          title: "Compte",
          items: [
            { href: "/espace/notifications", label: "Notifications", icon: "bell", badge: unread },
            { href: "/espace/profil", label: "Mon profil", icon: "user" },
            { href: "/espace/contact", label: "Contacter l'équipe", icon: "mail" },
          ],
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
