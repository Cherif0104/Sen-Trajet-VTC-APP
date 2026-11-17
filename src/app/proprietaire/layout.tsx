import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/server/auth";
import { logout } from "@/server/actions/public";
import { unreadCount } from "@/server/queries/client";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Espace propriétaire", robots: { index: false } };

export default async function OwnerLayout({ children }: LayoutProps<"/proprietaire">) {
  const user = await requireRole("proprietaire");
  const [settings, unread] = await Promise.all([getSettings(), unreadCount(user.id)]);
  return (
    <AppShell
      spaceLabel="Espace propriétaire"
      logoUrl={settings.branding.logoUrl}
      logoutAction={logout}
      notificationsHref="/proprietaire/notifications"
      unread={unread}
      user={{ name: user.fullName, subtitle: user.companyName ?? "Propriétaire partenaire" }}
      sections={[
        {
          items: [
            { href: "/proprietaire", label: "Tableau de bord", icon: "dashboard", exact: true },
            { href: "/proprietaire/vehicules/nouveau", label: "Proposer un véhicule", icon: "plus" },
            { href: "/proprietaire/vehicules", label: "Mes véhicules", icon: "car" },
            { href: "/proprietaire/documents", label: "Mes documents", icon: "documents" },
            { href: "/proprietaire/contrats", label: "Mes contrats", icon: "contracts" },
            { href: "/proprietaire/paiements", label: "Mes paiements", icon: "payments" },
          ],
        },
        {
          title: "Compte",
          items: [
            { href: "/proprietaire/notifications", label: "Notifications", icon: "bell", badge: unread },
            { href: "/proprietaire/profil", label: "Mon profil", icon: "user" },
          ],
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
