"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlaceField } from "@/components/place-field"
import { useMe } from "@/components/use-me"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/client"
import type { ClientFeatures } from "@/lib/domain"
import type { MeDTO } from "@/lib/dto"
import type { GeoPoint } from "@/lib/places"
import { fcfa, formatWhen, txLabel } from "@/lib/format"
import Link from "next/link"
import { cn } from "cn"

export default function AccountPage() {
  const router = useRouter()
  const { me, loading, error, reload } = useMe()
  const [busy, setBusy] = useState(false)

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

      {me.role === "admin" ? (
        <Link href="/app/admin" className={buttonVariants({ size: "lg" })}>
          Exploitation
        </Link>
      ) : null}

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

      <ClientSpace me={me} busy={busy} setBusy={setBusy} reload={reload} />

      {me.role !== "admin" ? (
        <Link href="/chauffeur/inscription" className="flex items-center justify-between gap-3 rounded-3xl bg-card px-4 py-4">
          <span>
            <span className="block font-medium">Tu as une voiture ?</span>
            <span className="text-sm text-muted-foreground">Inscris-toi comme chauffeur Sen Trajet.</span>
          </span>
          <span className="text-sm font-medium text-accent">Commencer</span>
        </Link>
      ) : null}

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
        <h2 className="font-display text-2xl">Paiements</h2>
        {me.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun paiement pour l’instant.</p>
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

function ClientSpace({
  me,
  busy,
  setBusy,
  reload,
}: {
  me: MeDTO
  busy: boolean
  setBusy: (value: boolean) => void
  reload: () => Promise<void>
}) {
  const [accountType, setAccountType] = useState(me.accountType)
  const [companyName, setCompanyName] = useState(me.companyName)
  const [features, setFeatures] = useState<ClientFeatures>(me.features)
  const [places, setPlaces] = useState<GeoPoint[]>(me.places)
  const rows: { key: keyof ClientFeatures; label: string; detail: string }[] = [
    { key: "course", label: "Course", detail: features.course ? "Ouvert" : "Fermé" },
    { key: "sieges", label: "Sièges", detail: features.sieges ? "Ouvert" : "Fermé pour ce compte" },
    { key: "lieux", label: "Lieux enregistrés", detail: `${places.length} lieu${places.length > 1 ? "x" : ""}` },
    { key: "facture", label: "Facture du mois", detail: features.facture ? fcfa(me.invoiceMonth) : "Fermée" },
    { key: "serein", label: "Trajet Serein", detail: features.serein ? "Ouvert" : "Fermé" },
  ]

  function toggle(key: keyof ClientFeatures) {
    if (key === "plafond") return
    setFeatures((current) => ({ ...current, [key]: !current[key] }))
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await api<MeDTO>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          accountType,
          companyName,
          features: { ...features, plafond: accountType === "entreprise" ? Number(new FormData(event.currentTarget).get("plafond")) : 0 },
          places,
        }),
      })
      toast.success("Espace mis à jour.")
      await reload()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Enregistrement impossible.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-2xl">{accountType === "entreprise" ? companyName || "Entreprise" : "Espace client"}</h2>
      <form className="flex flex-col gap-3" onSubmit={(event) => void save(event)}>
        <div className="grid grid-cols-2 gap-2">
          {(["particulier", "entreprise"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={`rounded-full px-3 py-2 text-sm ${accountType === type ? "bg-primary text-primary-foreground" : "bg-card"}`}
            >
              {type === "entreprise" ? "Entreprise" : "Particulier"}
            </button>
          ))}
        </div>
        {accountType === "entreprise" ? (
          <Field>
            <FieldLabel htmlFor="company">Nom de l’entreprise</FieldLabel>
            <Input id="company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} size="lg" required />
          </Field>
        ) : null}
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3">
            <span>
              <span className="block font-medium">{row.label}</span>
              <span className="text-sm text-muted-foreground">{row.detail}</span>
            </span>
            <Switch checked={Boolean(features[row.key])} onCheckedChange={() => toggle(row.key)} aria-label={row.label} />
          </div>
        ))}
        {accountType === "entreprise" ? (
          <Field>
            <FieldLabel htmlFor="plafond">Plafond d’une course, en FCFA</FieldLabel>
            <Input id="plafond" name="plafond" size="lg" inputMode="numeric" defaultValue={features.plafond || 80000} />
          </Field>
        ) : null}
        {features.lieux ? (
          <div className="flex flex-col gap-2">
            <PlaceField
              label="Ajouter un lieu"
              value={null}
              placeholder="Siège, dépôt, pharmacie…"
              onChange={(place) =>
                setPlaces((current) =>
                  current.some((item) => item.label === place.label) ? current : [...current, place].slice(0, 12),
                )
              }
            />
            {places.map((place) => (
              <span key={`${place.label}-${place.lat}`} className="text-sm text-muted-foreground">
                {place.label}
              </span>
            ))}
          </div>
        ) : null}
        <Button type="submit" size="lg" disabled={busy}>
          Enregistrer l’espace
        </Button>
      </form>
    </section>
  )
}
