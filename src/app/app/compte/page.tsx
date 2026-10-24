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
import { CATEGORIES, RIDE_CLASSES, type CategoryId } from "@/lib/domain"
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
      toast.success("Dossier envoyé. On te prévient.")
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

  async function markRead() {
    await api("/api/me", { method: "DELETE" })
    await reload()
  }

  if (loading) return <p className="px-4 py-8 text-muted-foreground">Chargement du compte…</p>
  if (!me) return <p className="px-4 py-8 text-muted-foreground">{error}</p>

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="font-display text-4xl">{me.name}</h1>
        <p className="text-sm text-muted-foreground">
          {me.rating.toFixed(1).replace(".", ",")} · {me.tripCount} courses · {me.phone}
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card px-4 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Solde</p>
            <p className="font-display text-5xl tabular-nums">{fcfa(me.balance)}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Wave arrive. Pour l’instant, espèces ou solde.</p>
        {me.role === "admin" ? (
          <Link href="/app/admin" className={buttonVariants({ size: "lg" })}>
            Exploitation
          </Link>
        ) : null}
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
              {me.driver.serene ? " · Trajet Serein" : ""} ·{" "}
              {me.driver.kyc === "verified" ? (me.driver.online ? "en ligne" : "hors ligne") : "dossier en revue"}
            </p>
            <Link href="/app/chauffeur" className={buttonVariants({ size: "lg" })}>
              Ouvrir le poste chauffeur
            </Link>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={(event) => void become(event)}>
            <p className="text-sm text-muted-foreground">Plaque du type DK 1234 AB. On valide le dossier avant la mise en ligne.</p>
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
              Envoyer le dossier
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

      <Button variant="outline" size="lg" onClick={() => void logout()}>
        Se déconnecter
      </Button>
    </div>
  )
}

function CategoryField() {
  const [category, setCategory] = useState<CategoryId>("eco")
  return (
    <div className="grid grid-cols-2 gap-2">
      <input type="hidden" name="category" value={category} />
      {RIDE_CLASSES.map((id) => (
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
