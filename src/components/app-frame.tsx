"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock3Icon, HouseIcon, UserRoundIcon, UsersIcon } from "lucide-react"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { buttonVariants } from "@/components/ui/button"
import { useMe } from "@/components/use-me"
import { cn } from "cn"

const links = [
  { href: "/app", label: "Accueil", icon: HouseIcon },
  { href: "/app/covoiturage", label: "Sièges", icon: UsersIcon },
  { href: "/app/activite", label: "Activité", icon: Clock3Icon },
  { href: "/app/compte", label: "Compte", icon: UserRoundIcon },
]

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const focus = pathname.startsWith("/app/course")
  const { me } = useMe()
  if (focus) return <div className="min-h-dvh bg-background">{children}</div>

  return (
    <div className="min-h-dvh bg-muted md:grid md:grid-cols-[minmax(0,1fr)_28rem]">
      <aside className="hidden flex-col justify-between border-r border-border bg-background px-10 py-12 text-foreground md:flex">
        <div className="flex flex-col gap-8">
          <SenTrajetMark />
          <div className="flex max-w-md flex-col gap-4">
            <p className="font-display text-5xl leading-[1.05] text-balance">La route, sans négocier au feu.</p>
            <p className="text-base text-muted-foreground">
              Courses immédiates à Dakar. Sièges réservés vers Thiès, Mbour, Touba et Saint-Louis. Le prix est fixé avant de monter.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Heure de Dakar · francs CFA · Wave, Orange Money, Free Money, espèces</p>
      </aside>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background md:max-w-none">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
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
        <div className="flex flex-1 flex-col pb-24">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:absolute">
          <ul className="mx-auto grid max-w-lg grid-cols-4">
            {links.map((link) => {
              const active = link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href)
              const Icon = link.icon
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "relative flex flex-col items-center gap-1 px-2 py-2.5 text-xs",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon />
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
