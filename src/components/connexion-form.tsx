"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/client"

export function ConnexionForm({ next, tab }: { next: string; tab?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const destination = next.startsWith("/app") ? next : "/app"

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
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 py-8">
        <SenTrajetMark />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl">Connexion</h1>
          <p className="text-muted-foreground">E-mail et mot de passe. Le prix se voit avant de monter.</p>
        </div>
        <Tabs defaultValue={tab === "signup" ? "signup" : "login"}>
          <TabsList className="w-full">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Créer un compte</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="pt-4">
            <AuthFields
              busy={busy}
              submitLabel="Se connecter"
              onSubmit={(values) => enter("/api/auth/login", values)}
            />
          </TabsContent>
          <TabsContent value="signup" className="pt-4">
            <SignupFields busy={busy} onSubmit={(values) => enter("/api/auth/signup", values)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function AuthFields({
  busy,
  submitLabel,
  onSubmit,
}: {
  busy: boolean
  submitLabel: string
  onSubmit: (values: Record<string, string>) => void
}) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        onSubmit({
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
      <Button type="submit" size="xl" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  )
}

function SignupFields({
  busy,
  onSubmit,
}: {
  busy: boolean
  onSubmit: (values: Record<string, string>) => void
}) {
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        onSubmit({
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
          <Input id="signup-password" name="password" type="password" size="lg" autoComplete="new-password" minLength={8} required />
        </Field>
      </FieldGroup>
      <Button type="submit" size="xl" disabled={busy}>
        Créer mon compte
      </Button>
    </form>
  )
}
