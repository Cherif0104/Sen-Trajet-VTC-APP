"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useMe } from "@/components/use-me"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/client"
import { CATEGORIES, CATEGORY_ORDER, type CategoryId, type PayMethod } from "@/lib/domain"
import { DEMO_ACCOUNTS } from "@/lib/demo"
import type { MeDTO } from "@/lib/dto"
import { fcfa, formatWhen, txLabel } from "@/lib/format"
import Link from "next/link"
import { cn } from "cn"

export default function AccountPage() {
  const router = useRouter()
  const { me, loading, error, reload } = useMe()
  const [busy, setBusy] = useState(false)
  const [sereneDriver, setSereneDriver] = useState(false)

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!me) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await api<MeDTO>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ name: data.get("name"), phone: data.get("phone") }),
      })
      toast.success("Profil mis à jour.")
      await reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Enregistrement impossible.")
    } finally {
      setBusy(false)
    }
  }

  async function topup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await api<MeDTO>("/api/wallet", {
        method: "POST",
        body: JSON.stringify({ amount: Number(data.get("amount")), method: data.get("method") }),
      })
      toast.success("Portefeuille rechargé. Aucun débit réel en pré-production.")
      await reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Recharge impossible.")
    } finally {
      setBusy(false)
    }
  }

  async function become(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await api<MeDTO>("/api/me/driver", {
        method: "POST",
        body: JSON.stringify({
          category: data.get("category"),
          make: data.get("make"),
          model: data.get("model"),
          color: data.get("color"),
          plate: data.get("plate"),
          serene: data.get("serene") === "on",
        }),
      })
      toast.success("Véhicule vérifié. Vous pouvez passer en ligne.")
      await reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Vérification impossible.")
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" })
    router.replace("/connexion")
    router.refresh()
  }

  async function enterDemo(email: string) {
    setBusy(true)
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: DEMO_ACCOUNTS.rider.password }),
      })
      router.replace("/app")
      router.refresh()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Changement de compte impossible.")
      setBusy(false)
    }
  }

  async function markRead() {
    await api("/api/me", { method: "DELETE" })
    await reload()
  }

  if (loading) return <p className="px-4 py-8 text-muted-foreground">Chargement du compte…</p>
  if (!me) return <p className="px-4 py-8 text-muted-foreground">{error}</p>

  const other = me.email === DEMO_ACCOUNTS.driver.email ? DEMO_ACCOUNTS.rider : DEMO_ACCOUNTS.driver

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="font-display text-4xl">{me.name}</h1>
        <p className="text-sm text-muted-foreground">
          {me.rating.toFixed(1).replace(".", ",")} · {me.tripCount} courses · {me.phone}
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-3xl bg-card px-4 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Portefeuille Yoon</p>
            <p className="font-display text-4xl">{fcfa(me.balance)}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          En pré-production, Wave, Orange Money et Free Money se confirment tout seuls. Aucun argent n’est débité. Le
          même écran branchera le webhook marchand.
        </p>
        <form className="flex flex-col gap-3" onSubmit={(event) => void topup(event)}>
          <div className="flex gap-2">
            {[2000, 5000, 10000].map((amount) => (
              <button
                key={amount}
                type="button"
                className="rounded-full bg-muted px-3 py-1.5 text-sm"
                onClick={(event) => {
                  const input = event.currentTarget.form?.elements.namedItem("amount")
                  if (input instanceof HTMLInputElement) input.value = String(amount)
                }}
              >
                {fcfa(amount)}
              </button>
            ))}
          </div>
          <Input name="amount" size="lg" inputMode="numeric" defaultValue={5000} min={500} max={500000} required />
          <div className="grid grid-cols-3 gap-2 text-sm">
            {(
              [
                ["wave", "Wave"],
                ["orange", "Orange"],
                ["free", "Free"],
              ] as [PayMethod, string][]
            ).map(([id, label]) => (
              <label key={id} className="flex items-center justify-center gap-2 rounded-xl border border-border px-2 py-2">
                <input type="radio" name="method" value={id} defaultChecked={id === "wave"} />
                {label}
              </label>
            ))}
          </div>
          <Button type="submit" size="lg" disabled={busy}>
            Recharger
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Profil</h2>
        <form className="flex flex-col gap-3" onSubmit={(event) => void saveProfile(event)}>
          <Field>
            <FieldLabel htmlFor="name">Nom</FieldLabel>
            <Input id="name" name="name" size="lg" defaultValue={me.name} required />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Mobile</FieldLabel>
            <Input id="phone" name="phone" size="lg" defaultValue={me.phone} required />
          </Field>
          <Button type="submit" variant="secondary" size="lg" disabled={busy}>
            Enregistrer
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Véhicule</h2>
        {me.driver ? (
          <div className="flex flex-col gap-3 rounded-3xl bg-secondary px-4 py-4 text-secondary-foreground">
            <p className="font-medium">
              {CATEGORIES[me.driver.category].label} · {me.driver.color} {me.driver.make} {me.driver.model}
            </p>
            <p className="text-sm">
              {me.driver.plate}
              {me.driver.serene ? " · Trajet Serein" : ""} · {me.driver.online ? "en ligne" : "hors ligne"}
            </p>
            <Link href="/app/chauffeur" className={buttonVariants({ size: "lg" })}>
              Ouvrir le poste chauffeur
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={(event) => void become(event)}>
            <p className="text-sm text-muted-foreground">
              Une plaque du type DK 1234 AB et les infos du véhicule suffisent. La vérification est automatique.
            </p>
            <CategoryField />
            <Input name="make" size="lg" placeholder="Marque" required />
            <Input name="model" size="lg" placeholder="Modèle" required />
            <Input name="color" size="lg" placeholder="Couleur" required />
            <Input name="plate" size="lg" placeholder="DK 1234 AB" required />
            <input type="hidden" name="serene" value={sereneDriver ? "on" : ""} />
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
              <span>Trajet Serein</span>
              <Switch checked={sereneDriver} onCheckedChange={setSereneDriver} aria-label="Trajet Serein" />
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              Vérifier et activer
            </Button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Notifications</h2>
          {me.unread > 0 ? (
            <button type="button" className="text-sm underline-offset-4 hover:underline" onClick={() => void markRead()}>
              Tout marquer comme lu
            </button>
          ) : null}
        </div>
        {me.notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune notification.</p>
        ) : (
          me.notifications.map((item) => (
            <Link
              key={item.id}
              href={item.href ?? "/app/compte"}
              className={cn("rounded-2xl px-4 py-3", item.read ? "bg-muted" : "bg-card")}
            >
              <span className="block font-medium">{item.title}</span>
              <span className="text-sm text-muted-foreground">
                {item.body} · {formatWhen(item.createdAt)}
              </span>
            </Link>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Mouvements</h2>
        {me.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun mouvement.</p>
        ) : (
          me.transactions.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 text-sm">
              <span>
                <span className="block">{txLabel(item.type)}</span>
                <span className="text-muted-foreground">{item.reference}</span>
              </span>
              <span>
                {item.amount > 0 ? "+" : ""}
                {fcfa(item.amount)}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl">Démonstration</h2>
        <Button variant="secondary" size="lg" disabled={busy} onClick={() => void enterDemo(other.email)}>
          Passer sur le compte {other.name}
        </Button>
        <Button variant="outline" size="lg" onClick={() => void logout()}>
          Se déconnecter
        </Button>
      </section>
    </div>
  )
}

function CategoryField() {
  const [category, setCategory] = useState<CategoryId>("eco")
  return (
    <div className="grid grid-cols-2 gap-2">
      <input type="hidden" name="category" value={category} />
      {CATEGORY_ORDER.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setCategory(id)}
          className={cn(
            "rounded-2xl border px-3 py-3 text-left text-sm",
            category === id ? "border-foreground bg-card" : "border-border",
          )}
        >
          <span className="block font-medium">{CATEGORIES[id].label}</span>
          <span className="text-muted-foreground">{CATEGORIES[id].detail}</span>
        </button>
      ))}
    </div>
  )
}
