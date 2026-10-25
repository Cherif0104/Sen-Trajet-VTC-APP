"use client"

import { useEffect, useState } from "react"
import { CircleAlert } from "lucide-react"
import { useMe } from "@/components/use-me"
import { api } from "@/lib/client"
import { fcfa, formatWhen, txLabel } from "@/lib/format"

type Wallet = { balance: number; debtLimit: number; blocked: boolean }

export default function DriverWalletPage() {
  const { me, loading, error } = useMe()
  const [wallet, setWallet] = useState<Wallet | null>(null)

  useEffect(() => {
    void api<Wallet>("/api/driver")
      .then(setWallet)
      .catch(() => undefined)
  }, [])

  if (loading) return <p className="px-4 py-8 text-muted-foreground">Chargement du solde…</p>
  if (!me) return <p className="px-4 py-8 text-muted-foreground">{error}</p>

  const balance = wallet?.balance ?? me.balance
  const limit = wallet?.debtLimit ?? 0
  const debt = Math.max(0, -balance)
  const used = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="font-display text-4xl">Solde chauffeur</h1>
        <p className="mt-1 text-sm text-muted-foreground">La commission Sen Trajet est prélevée ici à chaque course.</p>
      </div>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card px-5 py-5">
        <p className="text-sm text-muted-foreground">{balance < 0 ? "Commission due" : "Disponible"}</p>
        <p className={balance < 0 ? "font-display text-5xl text-accent tabular-nums" : "font-display text-5xl tabular-nums"}>
          {fcfa(balance)}
        </p>
        {limit > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={used >= 100 ? "h-full rounded-full bg-accent" : "h-full rounded-full bg-emerald-400"}
                style={{ width: `${used}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Plafond de dette : {fcfa(limit)}. Au-delà, les nouvelles courses sont bloquées.
            </p>
          </div>
        ) : null}
      </section>

      {wallet?.blocked ? (
        <div className="flex gap-3 rounded-2xl border border-accent/60 bg-accent/10 px-4 py-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent" />
          <p>
            <span className="font-medium">Courses bloquées.</span> Règle au moins {fcfa(debt - limit)} pour repasser en ligne.
          </p>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Comment ça marche</h2>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="rounded-2xl bg-card px-4 py-3">
            <span className="block font-medium">Course payée en espèces</span>
            <span className="text-muted-foreground">Tu gardes l’argent. La commission est déduite de ton solde.</span>
          </li>
          <li className="rounded-2xl bg-card px-4 py-3">
            <span className="block font-medium">Course payée par solde client</span>
            <span className="text-muted-foreground">Ta part nette est créditée sur ton solde.</span>
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Recharger</h2>
        <div className="rounded-2xl bg-card px-4 py-3 text-sm">
          <span className="block font-medium">Dépôt en agence Sen Trajet</span>
          <span className="text-muted-foreground">
            Paie en espèces à l’agence. L’équipe crédite ton solde et tu reçois une notification.
          </span>
        </div>
        {["Wave", "Orange Money", "Free Money"].map((label) => (
          <div key={label} className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            <span>{label}</span>
            <span>Bientôt</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Historique</h2>
        {me.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun mouvement. Ta première course apparaîtra ici.</p>
        ) : (
          me.transactions.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3 text-sm">
              <span className="min-w-0">
                <span className="block">{txLabel(item.type)}</span>
                <span className="text-muted-foreground">{formatWhen(item.createdAt)}</span>
              </span>
              <span className={item.amount < 0 ? "text-accent tabular-nums" : "tabular-nums"}>
                {item.amount > 0 ? "+" : ""}
                {fcfa(item.amount)}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
