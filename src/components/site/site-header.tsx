"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, UserRound, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button-link";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { telLink } from "@/lib/format";

const NAV = [
  { href: "/prestations", label: "Prestations" },
  { href: "/vehicules", label: "Véhicules" },
  { href: "/devenir-proprietaire", label: "Devenir propriétaire" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({
  logoUrl,
  phone,
  account,
}: {
  logoUrl: string | null;
  phone: string;
  account: { name: string; href: string } | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overHero = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !overHero;
  const close = () => setOpen(false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        solid ? "border-b border-white/10 bg-ink/95 backdrop-blur-md" : "bg-gradient-to-b from-ink/80 to-transparent",
      )}
    >
      <div className="container-page flex h-[4.25rem] items-center justify-between gap-4">
        <Logo logoUrl={logoUrl} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:text-gold-light",
                  active && "text-gold-light",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={account?.href ?? "/connexion"}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 hover:text-gold-light"
          >
            <UserRound className="size-4" />
            {account ? account.name.split(" ")[0] : "Connexion"}
          </Link>
          <ButtonLink href="/reservation" className="h-10 px-5 font-semibold">
            Réserver
          </ButtonLink>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <a href={telLink(phone)} aria-label="Appeler" className="inline-flex size-10 items-center justify-center rounded-md text-gold-light">
            <Phone className="size-5" />
          </a>
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-md text-white"
          >
            <Menu className="size-6" />
          </button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="right" showCloseButton={false} className="w-full max-w-sm border-l border-white/10 bg-ink p-0 text-white">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-[4.25rem] items-center justify-between px-5">
                <Logo logoUrl={logoUrl} href={null} />
                <button type="button" aria-label="Fermer le menu" onClick={close} className="inline-flex size-10 items-center justify-center rounded-md">
                  <X className="size-6" />
                </button>
              </div>
              <div className="gold-hairline" />
              <nav className="flex flex-col overflow-y-auto p-3" aria-label="Navigation mobile">
                {[{ href: "/", label: "Accueil" }, ...NAV, { href: "/faq", label: "Questions fréquentes" }].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "rounded-lg px-4 py-3.5 text-lg font-medium text-white/85 hover:bg-white/5 hover:text-gold-light",
                      pathname === item.href && "text-gold-light",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto grid gap-3 p-5">
                <ButtonLink href="/reservation" onClick={close} className="h-12 text-base font-semibold">
                  Demander une réservation
                </ButtonLink>
                <ButtonLink
                  href={account?.href ?? "/connexion"}
                  onClick={close}
                  variant="outline"
                  className="h-12 border-white/20 bg-transparent text-base text-white hover:bg-white/10 hover:text-white"
                >
                  {account ? "Mon espace" : "Se connecter"}
                </ButtonLink>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
