"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BadgeDollarSign,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck2,
  CarFront,
  ClipboardList,
  FileSignature,
  FileText,
  Gauge,
  Handshake,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquareQuote,
  Plus,
  Receipt,
  Route,
  Settings,
  ShieldCheck,
  Tags,
  UserRound,
  UsersRound,
  Wallet,
  Wrench,
  X,
  FolderOpen,
  ListChecks,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  requests: ClipboardList,
  reservations: CalendarCheck2,
  quotes: FileText,
  invoices: Receipt,
  bell: Bell,
  user: UserRound,
  mail: Mail,
  plus: Plus,
  car: CarFront,
  tags: Tags,
  features: ListChecks,
  customers: UsersRound,
  owners: Building2,
  drivers: Gauge,
  missions: Route,
  contracts: FileSignature,
  payments: Wallet,
  finance: BadgeDollarSign,
  maintenance: Wrench,
  partners: Handshake,
  testimonials: MessageSquareQuote,
  inbox: Inbox,
  content: BookOpen,
  users: ShieldCheck,
  settings: Settings,
  audit: History,
  documents: FolderOpen,
  reports: BarChart3,
} as const;
export type IconName = keyof typeof ICONS;

export type NavItem = { href: string; label: string; icon: IconName; badge?: number; exact?: boolean };
export type NavSection = { title?: string; items: NavItem[] };

export function AppShell({
  sections,
  user,
  spaceLabel,
  logoUrl,
  logoutAction,
  notificationsHref,
  unread,
  children,
}: {
  sections: NavSection[];
  user: { name: string; subtitle: string };
  spaceLabel: string;
  logoUrl: string | null;
  logoutAction: () => Promise<void>;
  notificationsHref: string;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo logoUrl={logoUrl} />
        <button type="button" onClick={() => setOpen(false)} className="inline-flex size-9 items-center justify-center rounded-md lg:hidden" aria-label="Fermer le menu">
          <X className="size-5" />
        </button>
      </div>
      <p className="px-5 pb-3 text-[0.65rem] font-semibold tracking-[0.3em] text-gold/80 uppercase">{spaceLabel}</p>
      <div className="gold-hairline opacity-40" />
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label={spaceLabel}>
        {sections.map((section, i) => (
          <div key={i} className="space-y-1">
            {section.title && <p className="px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.2em] text-white/35 uppercase">{section.title}</p>}
            {section.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-sidebar-accent font-semibold text-gold-light" : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-gold" : "text-white/45")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-gold px-1.5 py-0.5 text-[0.65rem] leading-none font-bold text-ink">{item.badge > 99 ? "99+" : item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white">
          <ExternalLink className="size-4" /> Voir le site
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white">
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh bg-mist">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="animate-in slide-in-from-left absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl duration-200">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur md:px-8">
          <button type="button" onClick={() => setOpen(true)} className="inline-flex size-10 items-center justify-center rounded-md lg:hidden" aria-label="Ouvrir le menu">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <Link href={notificationsHref} className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-mist" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}>
            <Bell className="size-5" />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-gold ring-2 ring-white" />}
          </Link>
          <div className="flex items-center gap-3 pl-1">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-gold-light">
              {user.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.subtitle}</p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
