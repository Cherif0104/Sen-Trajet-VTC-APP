"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { changePassword, submitTestimonial, updateProfile } from "@/server/actions/account";
import { initialState } from "@/lib/action-state";

type Profile = {
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  jobTitle: string | null;
  address: string | null;
  city: string | null;
  accountType: string;
};

export function ProfileForm({ profile, showCompany }: { profile: Profile; showCompany: boolean }) {
  const [state, action] = useActionState(updateProfile, initialState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <TextField label="Nom complet" name="fullName" required defaultValue={profile.fullName} state={state} />
      <TextField label="E-mail" name="email_display" defaultValue={profile.email} disabled hint="Pour modifier votre e-mail, contactez l'équipe." />
      <TextField label="Téléphone" name="phone" type="tel" required defaultValue={profile.phone} state={state} />
      <TextField label="Ville" name="city" defaultValue={profile.city} state={state} />
      {showCompany && (
        <>
          <TextField label="Structure" name="companyName" defaultValue={profile.companyName} state={state} />
          <TextField label="Fonction" name="jobTitle" defaultValue={profile.jobTitle} state={state} />
        </>
      )}
      <TextField label="Adresse" name="address" defaultValue={profile.address} state={state} className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialState);
  return (
    <form action={action} className="grid gap-4" key={state.ok ? "done" : "form"} noValidate>
      <FormMessage state={state} />
      <TextField label="Mot de passe actuel" name="current" type="password" autoComplete="current-password" required state={state} />
      <TextField label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required hint="8 caractères minimum" state={state} />
      <TextField label="Confirmer" name="confirm" type="password" autoComplete="new-password" required state={state} />
      <div>
        <SubmitButton variant="outline" pendingLabel="Modification…">
          Modifier le mot de passe
        </SubmitButton>
      </div>
    </form>
  );
}

export function TestimonialForm() {
  const [state, action] = useActionState(submitTestimonial, initialState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <SelectField
        label="Note"
        name="rating"
        state={state}
        defaultValue="5"
        options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} / 5` }))}
      />
      <TextField label="Votre fonction (facultatif)" name="authorRole" state={state} />
      <TextAreaField label="Votre avis" name="content" required state={state} />
      <div>
        <SubmitButton variant="outline">Envoyer mon avis</SubmitButton>
      </div>
    </form>
  );
}
