"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Building2, KeyRound, UserRound } from "lucide-react";
import { CheckboxField, FormMessage, Honeypot, SelectField, SubmitButton, TextField } from "@/components/forms";
import { login, register } from "@/server/actions/public";
import { initialState } from "@/lib/action-state";
import { ACCOUNT_TYPES } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, initialState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormMessage state={state} />
      <TextField label="E-mail" name="email" type="email" autoComplete="email" required state={state} />
      <TextField label="Mot de passe" name="password" type="password" autoComplete="current-password" required state={state} />
      <SubmitButton className="h-12 w-full text-base" pendingLabel="Connexion…">
        <KeyRound className="size-4" /> Se connecter
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-ink underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">Mot de passe oublié ? Contactez SENTRAJET PREMIUM pour le réinitialiser.</p>
    </form>
  );
}

export function RegisterForm({ defaultProfile }: { defaultProfile: "client" | "proprietaire" }) {
  const [state, action] = useActionState(register, initialState);
  const [profile, setProfile] = useState<"client" | "proprietaire">((state.values?.profile as "proprietaire") ?? defaultProfile);
  const [accountType, setAccountType] = useState(state.values?.accountType ?? "particulier");
  return (
    <form action={action} className="relative space-y-5" noValidate>
      <Honeypot />
      <input type="hidden" name="profile" value={profile} />
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type d'espace">
        {(
          [
            ["client", "Espace client", "Réserver et suivre mes demandes", UserRound],
            ["proprietaire", "Espace propriétaire", "Confier mon véhicule", Building2],
          ] as const
        ).map(([value, title, sub, Icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={profile === value}
            onClick={() => setProfile(value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors",
              profile === value ? "border-gold bg-accent" : "border-border hover:border-graphite/30",
            )}
          >
            <Icon className="size-5 text-gold" />
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-xs text-muted-foreground">{sub}</span>
          </button>
        ))}
      </div>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Type de compte"
          name="accountType"
          options={ACCOUNT_TYPES}
          state={state}
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          className="sm:col-span-2"
        />
        <TextField label="Nom complet" name="fullName" required autoComplete="name" state={state} />
        <TextField label="Téléphone" name="phone" type="tel" required autoComplete="tel" placeholder="+221 …" state={state} />
        {accountType !== "particulier" && (
          <>
            <TextField label="Nom de la structure" name="companyName" required state={state} />
            <TextField label="Votre fonction" name="jobTitle" state={state} />
          </>
        )}
        <TextField label="E-mail" name="email" type="email" required autoComplete="email" state={state} />
        <TextField label="Ville" name="city" autoComplete="address-level2" state={state} />
        <TextField label="Mot de passe" name="password" type="password" required autoComplete="new-password" hint="8 caractères minimum" state={state} />
        <TextField label="Confirmer le mot de passe" name="confirm" type="password" required autoComplete="new-password" state={state} />
      </div>
      <CheckboxField
        name="consent"
        label={
          <>
            J&apos;accepte les{" "}
            <Link href="/cgv" className="underline" target="_blank">
              conditions générales
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="underline" target="_blank">
              politique de confidentialité
            </Link>
            .
          </>
        }
      />
      <SubmitButton className="h-12 w-full text-base" pendingLabel="Création du compte…">
        Créer mon compte
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-ink underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
