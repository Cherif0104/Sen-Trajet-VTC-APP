"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { YoonMark } from "@/components/yoon-mark"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/client"
import { DEMO_ACCOUNTS } from "@/lib/demo"

export function ConnexionForm({ next }: { next: string }) {
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
    <div className="grid min-h-dvh md:grid-cols-[minmax(0,1fr)_28rem]">
      <aside className="hidden flex-col justify-between bg-accent px-10 py-12 text-accent-foreground md:flex">
        <YoonMark className="[&_svg]:text-accent-foreground" />
        <div className="flex max-w-md flex-col gap-4">
          <p className="font-display text-5xl leading-[1.05]">Sama yoon.</p>
          <p className="text-accent-foreground/80">
            Un compte pour demander une course, réserver un siège, ou publier un départ.
          </p>
        </div>
        <p className="text-sm text-accent-foreground/70">15 000 F de crédit de bienvenue sur chaque nouveau compte.</p>
      </aside>
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8">
        <YoonMark className="md:hidden" />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl">Entrer dans Yoon</h1>
          <p className="text-muted-foreground">Les deux comptes de démonstration ouvrent l’application sans inscription.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {([DEMO_ACCOUNTS.rider, DEMO_ACCOUNTS.driver] as const).map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={busy}
              className="flex flex-col items-start gap-1 rounded-2xl border border-border bg-card px-4 py-4 text-left hover:bg-muted disabled:opacity-50"
              onClick={() => enter("/api/auth/login", { email: account.email, password: account.password })}
            >
              <span className="text-xs tracking-wide text-muted-foreground uppercase">{account.role}</span>
              <span className="font-medium">{account.name}</span>
              <span className="text-sm text-muted-foreground">{account.email}</span>
            </button>
          ))}
        </div>
        <Tabs defaultValue="login">
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
