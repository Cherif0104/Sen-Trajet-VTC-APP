import Link from "next/link";
import { cn } from "@/lib/utils";

export function OwnerTabs({ active }: { active: "owners" | "submissions" }) {
  const tabs = [
    { key: "owners", href: "/admin/proprietaires", label: "Propriétaires" },
    { key: "submissions", href: "/admin/proprietaires/soumissions", label: "Véhicules proposés" },
  ];
  return (
    <nav className="mb-5 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-border sm:w-fit">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn("flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium sm:flex-none", active === t.key ? "bg-ink text-gold-light" : "text-muted-foreground hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
