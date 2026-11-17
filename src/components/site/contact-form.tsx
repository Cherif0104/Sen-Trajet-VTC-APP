"use client";

import { useActionState } from "react";
import { FormMessage, Honeypot, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { submitContact } from "@/server/actions/public";
import { initialState } from "@/lib/action-state";

export function ContactForm({ defaults }: { defaults?: { name?: string; email?: string; phone?: string } }) {
  const [state, action] = useActionState(submitContact, initialState);
  return (
    <form action={action} className="relative grid gap-5 md:grid-cols-2" noValidate key={state.ok ? "sent" : "form"}>
      <Honeypot />
      <div className="md:col-span-2">
        <FormMessage state={state} />
      </div>
      <TextField label="Nom complet" name="name" required autoComplete="name" defaultValue={defaults?.name} state={state.ok ? undefined : state} />
      <TextField label="E-mail" name="email" type="email" required autoComplete="email" defaultValue={defaults?.email} state={state.ok ? undefined : state} />
      <TextField label="Téléphone" name="phone" type="tel" autoComplete="tel" defaultValue={defaults?.phone} state={state.ok ? undefined : state} />
      <TextField label="Objet" name="subject" required state={state.ok ? undefined : state} />
      <TextAreaField label="Message" name="body" required className="md:col-span-2" rows={6} state={state.ok ? undefined : state} />
      <div className="md:col-span-2">
        <SubmitButton className="h-12 w-full px-8 sm:w-auto">Envoyer le message</SubmitButton>
      </div>
    </form>
  );
}
