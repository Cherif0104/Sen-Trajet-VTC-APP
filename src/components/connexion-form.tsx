"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/client"

export function ConnexionForm({ next, tab, brushClass }: { next: string; tab?: string; brushClass: string }) {
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
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <div className="relative h-48">
          <Image
            src="/welcome/client.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 32rem) 32rem, 100vw"
            className="object-cover object-[center_28%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background" />
          <div className="absolute top-4 left-4 rounded-full bg-white px-3 py-2 text-[#121417]">
            <SenTrajetMark onLight />
          </div>
          <p
            className={`${brushClass} absolute bottom-2 left-5 -rotate-3 text-5xl leading-none text-[#FF4D2A]`}
            style={{ WebkitTextStroke: "5px #fff", paintOrder: "stroke fill" }}
          >
            ON Y VA
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl">Le prix, avant.</h1>
          <p className="text-muted-foreground">E-mail et mot de passe. Tu vois le montant avant de monter.</p>
        </div>
        <Tabs defaultValue={tab === "signup" ? "signup" : "login"}>
          <TabsList className="h-12 w-full rounded-full p-1">
            <TabsTrigger value="login" className="rounded-full">
              Connexion
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full">
              Créer un compte
            </TabsTrigger>
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
        </div>
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
