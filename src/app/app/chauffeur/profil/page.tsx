"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, CircleAlert } from "lucide-react"
import { useMe } from "@/components/use-me"
import { Button, buttonVariants } from "@/components/ui/button"
import { api } from "@/lib/client"
import { CATEGORIES, DRIVER_DOCUMENTS, type CategoryId } from "@/lib/domain"
import { formatWhen } from "@/lib/format"
import { cn } from "cn"

type Profile = {
  kyc: string
  category: CategoryId
  make: string
  model: string
  color: string
  plate: string
  year: number
  serene: boolean
  licenseNumber: string
  licenseExpiry: string
  documents: string[]
}

const kycLabel: Record<string, string> = {
  verified: "Dossier validé",
  pending: "Dossier en revue",
  rejected: "Dossier à corriger",
  draft: "Dossier incomplet",
}

export default function DriverProfilePage() {
  const router = useRouter()
  const { me, loading, error, reload } = useMe()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    void api<Profile>("/api/me/driver")
      .then(setProfile)
      .catch(() => undefined)
  }, [])

  async function logout() {
    await api("/api/auth/logout", { method: "POST" })
    router.replace("/connexion")
    router.refresh()
  }

  async function markRead() {
    await api("/api/me", { method: "DELETE" })
    await reload()
  }

  if (loading) return <p className="px-4 py-8 text-muted-foreground">Chargement du profil…</p>
  if (!me) return <p className="px-4 py-8 text-muted-foreground">{error}</p>

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="font-display text-4xl">{me.name}</h1>
        <p className="text-sm text-muted-foreground">
          {me.rating.toFixed(1).replace(".", ",")} · {me.phone} · {me.email}
        </p>
        {profile ? (
          <span
            className={cn(
              "mt-3 inline-flex rounded-full px-3 py-1 text-sm",
              profile.kyc === "verified" ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent",
            )}
          >
            {kycLabel[profile.kyc] ?? profile.kyc}
          </span>
        ) : null}
      </div>

      {profile ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">Véhicule</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Classe", CATEGORIES[profile.category].label],
              ["Plaque", profile.plate],
              ["Voiture", `${profile.make} ${profile.model}`],
              ["Année", profile.year ? String(profile.year) : "À renseigner"],
              ["Couleur", profile.color],
              ["Trajet Serein", profile.serene ? "Oui" : "Non"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-card px-4 py-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {profile ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl">Permis et pièces</h2>
          <div className="rounded-2xl bg-card px-4 py-3 text-sm">
            <span className="block text-muted-foreground">Permis</span>
            <span className="font-medium">
              {profile.licenseNumber
                ? `N° ${profile.licenseNumber} · jusqu’au ${new Date(profile.licenseExpiry).toLocaleDateString("fr-FR")}`
                : "À renseigner"}
            </span>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {DRIVER_DOCUMENTS.map((doc) => {
              const ok = profile.documents.includes(doc.id)
              return (
                <li key={doc.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
                  {ok ? <Check className="size-4 text-emerald-400" /> : <CircleAlert className="size-4 text-accent" />}
                  <span className="flex-1">{doc.label}</span>
                  <span className="text-muted-foreground">{ok ? "Reçue" : "Manquante"}</span>
                </li>
              )
            })}
          </ul>
          {profile.kyc === "draft" || profile.kyc === "rejected" ? (
            <Link href="/chauffeur/inscription" className={buttonVariants({ size: "lg" })}>
              Compléter mon dossier
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pour changer de véhicule ou de permis, passe à l’agence : l’équipe revalide le dossier.
            </p>
          )}
        </section>
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
              href={item.href ?? "/app/chauffeur/profil"}
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

      <Button variant="outline" size="lg" onClick={() => void logout()}>
        Se déconnecter
      </Button>
    </div>
  )
}
