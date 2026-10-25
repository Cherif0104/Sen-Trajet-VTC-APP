"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArmchairIcon, CarIcon, HouseIcon, UserRoundIcon, WalletIcon } from "lucide-react"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { useMe } from "@/components/use-me"
import { cn } from "cn"

const riderLinks = [
  { href: "/app", label: "Accueil", icon: HouseIcon },
  { href: "/app/activite", label: "Courses", icon: CarIcon },
  { href: "/app/covoiturage", label: "Sièges", icon: ArmchairIcon },
  { href: "/app/compte", label: "Compte", icon: UserRoundIcon },
]

const driverLinks = [
  { href: "/app/chauffeur", label: "Courses", icon: CarIcon },
  { href: "/app/chauffeur/solde", label: "Solde", icon: WalletIcon },
  { href: "/app/chauffeur/profil", label: "Profil", icon: UserRoundIcon },
]

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const focus = pathname.startsWith("/app/course")
  const mapHome = pathname === "/app"
  const { me } = useMe()
  const driver = Boolean(me?.driver) && me?.role !== "admin"
  const inDriverSpace = pathname.startsWith("/app/chauffeur")
  const misplaced = me != null && !focus && driver !== inDriverSpace

  useEffect(() => {
    if (!misplaced) return
    router.replace(driver ? "/app/chauffeur" : "/app")
  }, [misplaced, driver, router])

  if (focus) return <div className="min-h-dvh bg-background">{children}</div>
  if (misplaced) return <div className="min-h-dvh bg-background" />

  const links = driver
    ? driverLinks
    : riderLinks.filter((link) => link.href !== "/app/covoiturage" || me?.features.sieges !== false)

  return (
    <div className="min-h-dvh bg-background">
      <div className={cn("relative mx-auto flex min-h-dvh w-full max-w-lg flex-col", mapHome && "h-dvh")}>
        <header
          className={cn(
            "sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur",
            mapHome && "hidden",
          )}
        >
          <Link href={driver ? "/app/chauffeur" : "/app"} aria-label="Accueil Sen Trajet">
            <SenTrajetMark />
          </Link>
          {driver ? (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">Chauffeur</span>
          ) : null}
        </header>
        <div className={cn("flex flex-1 flex-col", mapHome && "relative min-h-0")}>{children}</div>
        <nav className="sticky bottom-0 z-30 mt-auto border-t border-border bg-background/95 backdrop-blur">
          <ul className={cn("mx-auto grid max-w-lg", links.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
            {links.map((link) => {
              const active =
                link.href === "/app" || link.href === "/app/chauffeur"
                  ? pathname === link.href
                  : pathname.startsWith(link.href)
              const Icon = link.icon
              const inbox = link.href === "/app/compte" || link.href === "/app/chauffeur/profil"
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "relative flex flex-col items-center gap-1 px-2 py-2 text-xs",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-full",
                        active && "bg-primary text-primary-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span>{link.label}</span>
                    {inbox && me && me.unread > 0 ? (
                      <span className="absolute top-2 right-6 size-2 rounded-full bg-primary">
                        <span className="sr-only">{me.unread} notifications</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
