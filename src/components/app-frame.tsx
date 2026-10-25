"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArmchairIcon, CarIcon, HouseIcon, UserRoundIcon } from "lucide-react"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { buttonVariants } from "@/components/ui/button"
import { useMe } from "@/components/use-me"
import { cn } from "cn"

const links = [
  { href: "/app", label: "Accueil", icon: HouseIcon },
  { href: "/app/activite", label: "Courses", icon: CarIcon },
  { href: "/app/covoiturage", label: "Sièges", icon: ArmchairIcon },
  { href: "/app/compte", label: "Compte", icon: UserRoundIcon },
]

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const focus = pathname.startsWith("/app/course")
  const mapHome = pathname === "/app"
  const { me } = useMe()
  if (focus) return <div className="min-h-dvh bg-background">{children}</div>

  return (
    <div className="min-h-dvh bg-background">
      <div className={cn("relative mx-auto flex min-h-dvh w-full max-w-lg flex-col", mapHome && "h-dvh")}>
        <header
          className={cn(
            "sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur",
            mapHome && "hidden",
          )}
        >
          <Link href="/app" aria-label="Accueil Sen Trajet">
            <SenTrajetMark />
          </Link>
          {me?.driver ? (
            <Link
              href={pathname.startsWith("/app/chauffeur") ? "/app" : "/app/chauffeur"}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              {pathname.startsWith("/app/chauffeur") ? "Mode passager" : "Mode chauffeur"}
            </Link>
          ) : null}
        </header>
        <div className={cn("flex flex-1 flex-col", mapHome && "relative min-h-0")}>{children}</div>
        <nav className="sticky bottom-0 z-30 mt-auto border-t border-border bg-background/95 backdrop-blur">
          <ul className="mx-auto grid max-w-lg grid-cols-4">
            {links.map((link) => {
              const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href)
              const Icon = link.icon
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
                    {link.href === "/app/compte" && me && me.unread > 0 ? (
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
