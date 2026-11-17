import { eq } from "drizzle-orm";
import { AppShell, type NavSection } from "@/components/app/app-shell";
import { requirePermission } from "@/server/auth";
import { logout } from "@/server/actions/public";
import { getDb, schema } from "@/server/db";
import { unreadCount } from "@/server/queries/client";
import { getSettings } from "@/server/settings";
import { roleLabel } from "@/lib/domain";
import { can, type Permission } from "@/lib/permissions";

export const metadata = { title: { default: "Back-office", template: "%s · Back-office SENTRAJET" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePermission("dashboard.view");
  const db = await getDb();
  const [settings, unread, requests, messages, submissions, testimonials] = await Promise.all([
    getSettings(),
    unreadCount(user.id),
    db.$count(schema.requests, eq(schema.requests.status, "nouvelle")),
    db.$count(schema.messages, eq(schema.messages.status, "nouveau")),
    db.$count(schema.ownerSubmissions, eq(schema.ownerSubmissions.status, "soumis")),
    db.$count(schema.testimonials, eq(schema.testimonials.status, "en_attente")),
  ]);
  const c = { requests, messages, submissions, testimonials };

  type Item = NavSection["items"][number] & { perm: Permission };
  const sections: { title?: string; items: Item[] }[] = [
    { items: [{ href: "/admin", label: "Tableau de bord", icon: "dashboard", exact: true, perm: "dashboard.view" }] },
    {
      title: "Commercial",
      items: [
        { href: "/admin/demandes", label: "Demandes & réservations", icon: "requests", badge: c?.requests, perm: "requests.manage" },
        { href: "/admin/devis", label: "Devis", icon: "quotes", perm: "quotes.manage" },
        { href: "/admin/missions", label: "Missions", icon: "missions", perm: "missions.manage" },
        { href: "/admin/clients", label: "Clients (CRM)", icon: "customers", perm: "customers.manage" },
        { href: "/admin/messages", label: "Messages", icon: "inbox", badge: c?.messages, perm: "messages.manage" },
      ],
    },
    {
      title: "Flotte",
      items: [
        { href: "/admin/vehicules", label: "Véhicules", icon: "car", perm: "vehicles.manage" },
        { href: "/admin/categories", label: "Catégories", icon: "tags", perm: "catalog.manage" },
        { href: "/admin/equipements", label: "Équipements", icon: "features", perm: "catalog.manage" },
        { href: "/admin/maintenance", label: "Maintenance", icon: "maintenance", perm: "maintenance.manage" },
        { href: "/admin/chauffeurs", label: "Chauffeurs", icon: "drivers", perm: "drivers.manage" },
        { href: "/admin/proprietaires", label: "Propriétaires", icon: "owners", badge: c?.submissions, perm: "owners.manage" },
      ],
    },
    {
      title: "Gestion",
      items: [
        { href: "/admin/contrats", label: "Contrats", icon: "contracts", perm: "contracts.manage" },
        { href: "/admin/factures", label: "Facturation", icon: "invoices", perm: "invoices.manage" },
        { href: "/admin/finances", label: "Finances", icon: "finance", perm: "finance.manage" },
        { href: "/admin/rapports", label: "Rapports & exports", icon: "reports", perm: "reports.view" },
      ],
    },
    {
      title: "Contenus",
      items: [
        { href: "/admin/contenu", label: "Contenus du site", icon: "content", perm: "content.manage" },
        { href: "/admin/partenaires", label: "Partenaires", icon: "partners", perm: "content.manage" },
        { href: "/admin/temoignages", label: "Témoignages", icon: "testimonials", badge: c?.testimonials, perm: "content.manage" },
      ],
    },
    {
      title: "Administration",
      items: [
        { href: "/admin/utilisateurs", label: "Utilisateurs & rôles", icon: "users", perm: "users.manage" },
        { href: "/admin/parametres", label: "Paramètres", icon: "settings", perm: "settings.manage" },
        { href: "/admin/journal", label: "Journal d'audit", icon: "audit", perm: "audit.view" },
      ],
    },
  ];

  const visible: NavSection[] = sections
    .map((s) => ({ title: s.title, items: s.items.filter((i) => can(user.role, i.perm)).map(({ perm: _perm, ...rest }) => rest) }))
    .filter((s) => s.items.length > 0);

  return (
    <AppShell
      spaceLabel="Back-office"
      logoUrl={settings.branding.logoUrl}
      logoutAction={logout}
      notificationsHref="/admin/notifications"
      unread={unread}
      user={{ name: user.fullName, subtitle: roleLabel(user.role) }}
      sections={visible}
    >
      {children}
    </AppShell>
  );
}
