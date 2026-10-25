"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/client"

export function ConnexionForm({ next, tab }: { next: string; tab?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">(tab === "signup" ? "signup" : "login")
  const [busy, setBusy] = useState(false)
  const destination = next.startsWith("/app") ? next : "/app"
  const signup = mode === "signup"

  async function enter(path: string, body: Record<string, string>) {
    setBusy(true)
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) })
      router.replace(destination)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion impossible.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <div className="relative h-[42svh] min-h-60">
          <Image
            src={signup ? "/welcome/inscription.jpg" : "/welcome/connexion.jpg"}
            alt={signup ? "Illustration, il s’installe dans la voiture" : "Illustration, elle attend à côté de la voiture"}
            fill
            priority
            sizes="(min-width: 32rem) 32rem, 100vw"
            className="object-cover object-[center_42%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-55% to-background" />
          <Link href="/" className="absolute top-4 left-4 rounded-full bg-white px-3 py-2 text-[#121417]">
            <SenTrajetMark onLight />
          </Link>
        </div>

        <div className="flex flex-1 flex-col px-5 pt-1 pb-8">
          <h1 className="font-display text-4xl">{signup ? "Créer un compte" : "Connexion"}</h1>
          <p className="mt-2 text-muted-foreground">
            {signup ? "Un compte, et le prix s’affiche avant de monter." : "Tu vois le montant avant de monter."}
          </p>

          {signup ? (
            <form
              className="mt-6 flex flex-1 flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                void enter("/api/auth/signup", {
                  name: String(data.get("name") ?? ""),
                  email: String(data.get("email") ?? ""),
                  phone: String(data.get("phone") ?? ""),
                  password: String(data.get("password") ?? ""),
                })
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Nom complet</FieldLabel>
                  <Input id="name" name="name" size="lg" autoComplete="name" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-email">E-mail</FieldLabel>
                  <Input id="signup-email" name="email" type="email" size="lg" autoComplete="email" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="phone">Mobile sénégalais</FieldLabel>
                  <Input id="phone" name="phone" size="lg" inputMode="tel" placeholder="77 123 45 67" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-password">Mot de passe</FieldLabel>
                  <Input
                    id="signup-password"
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
                  Créer mon compte
                </Button>
                <button type="button" className="py-2 text-sm font-medium text-white/80" onClick={() => setMode("login")}>
                  J’ai déjà un compte
                </button>
              </div>
            </form>
          ) : (
            <form
              className="mt-6 flex flex-1 flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                void enter("/api/auth/login", {
                  email: String(data.get("email") ?? ""),
                  password: String(data.get("password") ?? ""),
                })
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">E-mail</FieldLabel>
                  <Input id="email" name="email" type="email" size="lg" autoComplete="email" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <Input id="password" name="password" type="password" size="lg" autoComplete="current-password" required />
                </Field>
              </FieldGroup>
              <div className="mt-auto flex flex-col gap-3 pt-4">
                <Button type="submit" size="xl" disabled={busy}>
                  Se connecter
                </Button>
                <button type="button" className="py-2 text-sm font-medium text-white/80" onClick={() => setMode("signup")}>
                  Créer un compte
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
