"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DemoNote } from "@/components/demo-indicator"
import { api } from "@/lib/client"
import { DEMO_ACCOUNTS } from "@/lib/demo"
import { cn } from "cn"

const accounts = [
  {
    ...DEMO_ACCOUNTS.rider,
    href: "/app",
    detail: "Passagère à Sacré-Cœur. Portefeuille, course et siège, en direct.",
  },
  {
    ...DEMO_ACCOUNTS.driver,
    href: "/app/chauffeur",
    detail: "Chauffeur Éco. Demandes, mise en ligne et départs, en direct.",
  },
] as const

export function SimAccounts({ next }: { next: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const destination = next.startsWith("/app") ? next : "/app"

  async function enter(email: string, password: string, href: string) {
    setBusy(email)
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      router.replace(destination === "/app" ? href : destination)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion impossible.")
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <DemoNote>Ces profils sont fictifs. Un appui ouvre leur session réelle dans l’application.</DemoNote>
      {accounts.map((account) => (
        <button
          key={account.email}
          type="button"
          disabled={busy !== null}
          onClick={() => void enter(account.email, account.password, account.href)}
          className={cn(
            "flex flex-col items-start gap-1 rounded-3xl border border-border bg-card px-4 py-4 text-left",
            busy === account.email && "border-primary",
          )}
        >
          <span className="text-xs tracking-[0.16em] text-primary uppercase">{account.role}</span>
          <span className="font-display text-3xl">{account.name}</span>
          <span className="text-sm text-muted-foreground">{busy === account.email ? "Ouverture du profil…" : account.detail}</span>
        </button>
      ))}
    </div>
  )
}
