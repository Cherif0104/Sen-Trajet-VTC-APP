import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Le logo officiel est chargé depuis le back-office (Contenus › Identité) ;
 * en son absence on affiche le nom de marque en typographie, sans dessiner de faux logo.
 */
export function Logo({
  logoUrl,
  tone = "light",
  className,
  href = "/",
}: {
  logoUrl?: string | null;
  tone?: "light" | "dark";
  className?: string;
  href?: string | null;
}) {
  const inner = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="SENTRAJET PREMIUM" className="h-9 w-auto object-contain md:h-10" />
  ) : (
    <span className="flex flex-col leading-none">
      <span className={cn("font-display text-[1.45rem] font-bold tracking-[0.14em]", tone === "light" ? "text-gold-light" : "text-ink")}>
        SENTRAJET
      </span>
      <span className={cn("mt-0.5 text-[0.58rem] font-semibold tracking-[0.42em]", tone === "light" ? "text-white/70" : "text-graphite/70")}>
        PREMIUM
      </span>
    </span>
  );
  if (!href) return <span className={cn("inline-flex items-center", className)}>{inner}</span>;
  return (
    <Link href={href} aria-label="SENTRAJET PREMIUM — accueil" className={cn("inline-flex items-center", className)}>
      {inner}
    </Link>
  );
}
