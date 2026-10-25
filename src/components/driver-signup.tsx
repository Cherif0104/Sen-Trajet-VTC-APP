"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Camera, Check, CircleAlert, LoaderCircle } from "lucide-react"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/client"
import { CATEGORIES, DRIVER_DOCUMENTS, RIDE_CLASSES, type CategoryId, type DriverDocKind } from "@/lib/domain"

type Profile = {
  exists: boolean
  kyc: string
  rejectReason: string
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

const STEPS = ["Toi", "Ta voiture", "Ton permis", "Tes photos", "Envoi"] as const

const vehicleArt: Partial<Record<CategoryId, string>> = {
  eco: "/vehicles/eco.jpg",
  confort: "/vehicles/confort.jpg",
  confort_plus: "/vehicles/confort-plus.jpg",
}

const classHint: Partial<Record<CategoryId, string>> = {
  eco: "Citadine ou berline compacte, climatisée.",
  confort: "Berline récente, coffre spacieux.",
  confort_plus: "SUV ou berline haut de gamme.",
}

async function compress(file: File) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", 0.8)
}

export function DriverSignup() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState<CategoryId>("eco")
  const [serene, setSerene] = useState(false)
  const [uploading, setUploading] = useState<DriverDocKind | null>(null)
  const [previews, setPreviews] = useState<Partial<Record<DriverDocKind, string>>>({})

  const load = useCallback(
    () =>
      api<Profile>("/api/me/driver").then(
        (next) => {
          setLoggedIn(true)
          setProfile(next)
          setCategory(RIDE_CLASSES.includes(next.category) ? next.category : "eco")
          setSerene(next.serene)
          return next
        },
        () => {
          setLoggedIn(false)
          return null
        },
      ),
    [],
  )

  useEffect(() => {
    let live = true
    void load().then((next) => {
      if (!next || !live) return
      if (next.kyc === "pending" || next.kyc === "verified") {
        router.replace("/app/chauffeur")
        return
      }
      if (!next.exists || !next.year) setStep(1)
      else if (!next.licenseNumber || !next.licenseExpiry || !next.documents.includes("permis")) setStep(2)
      else if (DRIVER_DOCUMENTS.some((doc) => !next.documents.includes(doc.id))) setStep(3)
      else setStep(4)
    })
    return () => {
      live = false
    }
  }, [load, router])

  async function run(task: () => Promise<void>) {
    setBusy(true)
    try {
      await task()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible.")
    } finally {
      setBusy(false)
    }
  }

  async function upload(kind: DriverDocKind, file: File | undefined) {
    if (!file) return
    setUploading(kind)
    try {
      const dataUrl = await compress(file)
      await api("/api/me/driver", { method: "POST", body: JSON.stringify({ action: "document", kind, dataUrl }) })
      setPreviews((current) => ({ ...current, [kind]: dataUrl }))
      setProfile((current) =>
        current ? { ...current, documents: Array.from(new Set([...current.documents, kind])) } : current,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo refusée.")
    } finally {
      setUploading(null)
    }
  }

  function saveVehicle(fields: Record<string, unknown>) {
    return api<Profile>("/api/me/driver", {
      method: "POST",
      body: JSON.stringify({
        category: profile?.category ?? category,
        make: profile?.make ?? "",
        model: profile?.model ?? "",
        color: profile?.color ?? "",
        plate: profile?.plate ?? "",
        serene: profile?.serene ?? false,
        year: profile?.year || undefined,
        ...fields,
      }),
    })
  }

  if (loggedIn === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" /> Ouverture de ton dossier…
      </div>
    )
  }

  const docs = profile?.documents ?? []
  const has = (kind: DriverDocKind) => docs.includes(kind)
  const thisYear = new Date().getFullYear()

  function photoSlot(kind: DriverDocKind) {
    const doc = DRIVER_DOCUMENTS.find((item) => item.id === kind)!
    const preview = previews[kind]
    const done = has(kind)
    return (
      <label
        key={kind}
        className="flex cursor-pointer items-center gap-4 rounded-3xl border border-border bg-card p-3 transition-colors hover:border-foreground/40"
      >
        <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={doc.label} className="size-full object-cover" />
          ) : uploading === kind ? (
            <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
          ) : (
            <Camera className="size-6 text-muted-foreground" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{doc.label}</span>
          <span className="text-sm text-muted-foreground">{doc.hint}</span>
          <span className={done ? "mt-1 text-sm font-medium text-emerald-400" : "mt-1 text-sm font-medium text-accent"}>
            {uploading === kind ? "Envoi…" : done ? "Reçue · toucher pour remplacer" : "Prendre ou choisir une photo"}
          </span>
        </span>
        <input
          type="file"
          accept="image/*"
          capture={kind === "selfie" ? "user" : "environment"}
          className="sr-only"
          disabled={uploading != null}
          onChange={(event) => {
            void upload(kind, event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </label>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-4 pb-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-full bg-white px-3 py-2 text-[#121417]">
            <SenTrajetMark onLight />
          </Link>
          <span className="text-sm text-muted-foreground">Inscription chauffeur</span>
        </div>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            Étape {step + 1} sur {STEPS.length} · {STEPS[step]}
          </p>
          <div className="mt-2 grid grid-cols-5 gap-1.5" aria-hidden>
            {STEPS.map((label, index) => (
              <span key={label} className={index <= step ? "h-1.5 rounded-full bg-accent" : "h-1.5 rounded-full bg-muted"} />
            ))}
          </div>
        </div>

        {profile?.kyc === "rejected" && profile.rejectReason ? (
          <div className="mt-5 flex gap-3 rounded-2xl border border-accent/50 bg-accent/10 px-4 py-3 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent" />
            <p>
              <span className="font-medium">Dossier à corriger.</span> {profile.rejectReason}
            </p>
          </div>
        ) : null}

        {step === 0 ? (
          <form
            className="mt-6 flex flex-1 flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              void run(async () => {
                await api("/api/auth/signup", {
                  method: "POST",
                  body: JSON.stringify({
                    name: String(data.get("name") ?? ""),
                    email: String(data.get("email") ?? ""),
                    phone: String(data.get("phone") ?? ""),
                    password: String(data.get("password") ?? ""),
                  }),
                })
                await load()
                setStep(1)
              })
            }}
          >
            <div>
              <h1 className="font-display text-4xl">Conduis avec Sen Trajet</h1>
              <p className="mt-2 text-muted-foreground">
                Cinq étapes : ton compte, ta voiture, ton permis, tes photos, puis on vérifie ton dossier.
              </p>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="d-name">Nom complet, comme sur le permis</FieldLabel>
                <Input id="d-name" name="name" size="lg" autoComplete="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="d-email">E-mail</FieldLabel>
                <Input id="d-email" name="email" type="email" size="lg" autoComplete="email" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="d-phone">Mobile sénégalais</FieldLabel>
                <Input id="d-phone" name="phone" size="lg" inputMode="tel" placeholder="77 123 45 67" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="d-password">Mot de passe</FieldLabel>
                <Input
                  id="d-password"
                  name="password"
                  type="password"
                  size="lg"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
            </FieldGroup>
            <div className="mt-auto flex flex-col gap-3 pt-2">
              <Button type="submit" size="xl" disabled={busy}>
                Créer mon compte chauffeur
              </Button>
              <Link href="/connexion?next=/chauffeur/inscription" className="py-2 text-center text-sm font-medium text-white/80">
                J’ai déjà un compte, je me connecte
              </Link>
            </div>
          </form>
        ) : null}

        {step === 1 ? (
          <form
            className="mt-6 flex flex-1 flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              void run(async () => {
                setProfile(
                  await saveVehicle({
                    category,
                    serene,
                    make: String(data.get("make") ?? ""),
                    model: String(data.get("model") ?? ""),
                    year: Number(data.get("year") ?? 0),
                    color: String(data.get("color") ?? ""),
                    plate: String(data.get("plate") ?? ""),
                  }),
                )
                setStep(2)
              })
            }}
          >
            <div>
              <h1 className="font-display text-4xl">Ta voiture</h1>
              <p className="mt-2 text-muted-foreground">Choisis la classe qui correspond, puis décris le véhicule.</p>
            </div>
            <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1">
              {RIDE_CLASSES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  aria-pressed={category === id}
                  className={
                    category === id
                      ? "w-44 shrink-0 snap-start overflow-hidden rounded-3xl border-2 border-accent bg-card text-left"
                      : "w-44 shrink-0 snap-start overflow-hidden rounded-3xl border-2 border-transparent bg-card text-left"
                  }
                >
                  <span className="relative block h-24 bg-muted">
                    <Image src={vehicleArt[id]!} alt="" fill sizes="11rem" className="object-cover" />
                  </span>
                  <span className="block px-3 py-2">
                    <span className="block font-medium">{CATEGORIES[id].label}</span>
                    <span className="block text-xs text-muted-foreground">{classHint[id]}</span>
                  </span>
                </button>
              ))}
            </div>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="make">Marque</FieldLabel>
                  <Input id="make" name="make" size="lg" placeholder="Toyota" defaultValue={profile?.make} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="model">Modèle</FieldLabel>
                  <Input id="model" name="model" size="lg" placeholder="Corolla" defaultValue={profile?.model} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="year">Année</FieldLabel>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    size="lg"
                    inputMode="numeric"
                    min={1995}
                    max={thisYear + 1}
                    placeholder={String(thisYear - 6)}
                    defaultValue={profile?.year || undefined}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="color">Couleur</FieldLabel>
                  <Input id="color" name="color" size="lg" placeholder="Grise" defaultValue={profile?.color} required />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="plate">Plaque d’immatriculation</FieldLabel>
                <Input
                  id="plate"
                  name="plate"
                  size="lg"
                  placeholder="DK 1234 AB"
                  className="uppercase"
                  defaultValue={profile?.plate}
                  required
                />
              </Field>
            </FieldGroup>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted px-4 py-3">
              <span>
                <span className="block font-medium">Trajet Serein</span>
                <span className="block text-sm text-muted-foreground">Conduite calme, sans musique forte, clim allumée.</span>
              </span>
              <Switch checked={serene} onCheckedChange={setSerene} />
            </label>
            <div className="mt-auto pt-2">
              <Button type="submit" size="xl" className="w-full" disabled={busy}>
                Continuer
              </Button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form
            className="mt-6 flex flex-1 flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              void run(async () => {
                if (!has("permis")) throw new Error("Ajoute la photo de ton permis.")
                setProfile(
                  await saveVehicle({
                    licenseNumber: String(data.get("licenseNumber") ?? ""),
                    licenseExpiry: String(data.get("licenseExpiry") ?? ""),
                  }),
                )
                setStep(3)
              })
            }}
          >
            <div>
              <h1 className="font-display text-4xl">Ton permis</h1>
              <p className="mt-2 text-muted-foreground">Permis B en cours de validité. On vérifie le numéro avec la photo.</p>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="licenseNumber">Numéro du permis</FieldLabel>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  size="lg"
                  className="uppercase"
                  defaultValue={profile?.licenseNumber}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="licenseExpiry">Valable jusqu’au</FieldLabel>
                <Input
                  id="licenseExpiry"
                  name="licenseExpiry"
                  type="date"
                  size="lg"
                  defaultValue={profile?.licenseExpiry}
                  required
                />
              </Field>
            </FieldGroup>
            {photoSlot("permis")}
            <div className="mt-auto flex gap-3 pt-2">
              <Button type="button" variant="outline" size="xl" onClick={() => setStep(1)} aria-label="Retour">
                <ArrowLeft />
              </Button>
              <Button type="submit" size="xl" className="flex-1" disabled={busy || uploading != null}>
                Continuer
              </Button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="mt-6 flex flex-1 flex-col gap-4">
            <div>
              <h1 className="font-display text-4xl">Tes photos</h1>
              <p className="mt-2 text-muted-foreground">Trois photos nettes, prises en plein jour. Elles restent entre toi et l’équipe.</p>
            </div>
            {photoSlot("selfie")}
            {photoSlot("carte_grise")}
            {photoSlot("vehicule")}
            <div className="mt-auto flex gap-3 pt-2">
              <Button type="button" variant="outline" size="xl" onClick={() => setStep(2)} aria-label="Retour">
                <ArrowLeft />
              </Button>
              <Button
                size="xl"
                className="flex-1"
                disabled={uploading != null || !has("selfie") || !has("carte_grise") || !has("vehicule")}
                onClick={() => setStep(4)}
              >
                Continuer
              </Button>
            </div>
          </div>
        ) : null}

        {step === 4 && profile ? (
          <div className="mt-6 flex flex-1 flex-col gap-4">
            <div>
              <h1 className="font-display text-4xl">On vérifie</h1>
              <p className="mt-2 text-muted-foreground">
                Relis ton dossier. Une fois envoyé, l’équipe le valide et tu peux passer en ligne pour recevoir des courses.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {[
                {
                  label: "Véhicule",
                  value: `${CATEGORIES[profile.category].label} · ${profile.make} ${profile.model} ${profile.year} · ${profile.plate}`,
                  ok: Boolean(profile.year && profile.plate),
                  step: 1,
                },
                {
                  label: "Permis",
                  value: profile.licenseNumber
                    ? `N° ${profile.licenseNumber}, valable jusqu’au ${new Date(profile.licenseExpiry).toLocaleDateString("fr-FR")}`
                    : "À compléter",
                  ok: Boolean(profile.licenseNumber && profile.licenseExpiry),
                  step: 2,
                },
                ...DRIVER_DOCUMENTS.map((doc) => ({
                  label: doc.label,
                  value: has(doc.id) ? "Photo reçue" : "Photo manquante",
                  ok: has(doc.id),
                  step: doc.id === "permis" ? 2 : 3,
                })),
              ].map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => setStep(item.step)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left"
                  >
                    <span
                      className={
                        item.ok
                          ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
                          : "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent"
                      }
                    >
                      {item.ok ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{item.label}</span>
                      <span className="block truncate text-sm text-muted-foreground">{item.value}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">Modifier</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              Sen Trajet prend une commission sur chaque course. En espèces, elle est prélevée sur ton solde chauffeur. Au-delà
              d’un certain montant dû, les nouvelles courses sont suspendues jusqu’à la recharge.
            </div>
            <div className="mt-auto flex gap-3 pt-2">
              <Button type="button" variant="outline" size="xl" onClick={() => setStep(3)} aria-label="Retour">
                <ArrowLeft />
              </Button>
              <Button
                size="xl"
                className="flex-1"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await api("/api/me/driver", { method: "POST", body: JSON.stringify({ action: "submit" }) })
                    router.replace("/app/chauffeur")
                    router.refresh()
                  })
                }
              >
                Envoyer mon dossier
              </Button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
