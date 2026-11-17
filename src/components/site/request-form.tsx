"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Car, UserRound } from "lucide-react";
import { CheckboxField, FormMessage, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms";
import { submitRequest } from "@/server/actions/public";
import { initialState } from "@/lib/action-state";
import { ACCOUNT_TYPES, INTERCITY_DESTINATIONS, SERVICE_OPTIONS } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };
type VehicleOption = { id: string; slug: string; name: string; categoryId: string | null };

export function RequestForm({
  categories,
  vehicles,
  defaults,
}: {
  categories: Option[];
  vehicles: VehicleOption[];
  defaults: {
    kind: "reservation" | "devis";
    serviceType?: string;
    vehicleId?: string;
    categoryId?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    accountType?: string;
    companyName?: string;
  };
}) {
  const [state, action] = useActionState(submitRequest, initialState);
  const v = state.values;
  const [kind, setKind] = useState<"reservation" | "devis">((v?.kind as "devis") ?? defaults.kind);
  const [accountType, setAccountType] = useState(v?.accountType ?? defaults.accountType ?? "particulier");
  const [categoryId, setCategoryId] = useState(v?.categoryId ?? defaults.categoryId ?? "");
  const [serviceType, setServiceType] = useState(v?.serviceType ?? defaults.serviceType ?? "");
  const today = new Date().toISOString().slice(0, 10);

  const vehicleOptions = useMemo(
    () => vehicles.filter((x) => !categoryId || x.categoryId === categoryId).map((x) => ({ value: x.id, label: x.name })),
    [vehicles, categoryId],
  );
  const isReservation = kind === "reservation";

  return (
    <form action={action} className="relative space-y-8" noValidate>
      <Honeypot />
      <input type="hidden" name="kind" value={kind} />

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-mist p-1.5" role="radiogroup" aria-label="Type de demande">
        {(
          [
            ["reservation", "Demande de réservation"],
            ["devis", "Demande de devis"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={cn("rounded-lg px-3 py-3 text-sm font-semibold transition-colors", kind === value ? "bg-ink text-gold-light shadow" : "text-graphite hover:bg-white")}
          >
            {label}
          </button>
        ))}
      </div>

      <FormMessage state={state} />

      <fieldset className="space-y-5 rounded-2xl border border-border p-5 md:p-7">
        <legend className="flex items-center gap-2 px-2 text-base font-semibold">
          <Car className="size-5 text-gold" /> 1. Votre besoin
        </legend>
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            label="Type de prestation"
            name="serviceType"
            required
            state={state}
            options={SERVICE_OPTIONS}
            placeholder="Choisir une prestation"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            defaultValue={undefined}
          />
          <SelectField
            label="Catégorie souhaitée"
            name="categoryId"
            state={state}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Indifférent — conseillez-moi"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            defaultValue={undefined}
          />
          <SelectField
            label="Véhicule"
            name="vehicleId"
            state={state}
            options={vehicleOptions}
            placeholder={kind === "devis" ? "Sans préférence" : "Sans préférence — proposez-moi"}
            defaultValue={defaults.vehicleId}
            hint="Facultatif : nous pouvons vous proposer le véhicule le plus adapté."
          />
          <SelectField
            label="Chauffeur"
            name="withDriver"
            state={state}
            options={[
              { value: "oui", label: "Avec chauffeur" },
              { value: "non", label: "Sans chauffeur (selon conditions)" },
            ]}
            defaultValue="oui"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-2xl border border-border p-5 md:p-7">
        <legend className="flex items-center gap-2 px-2 text-base font-semibold">
          <CalendarDays className="size-5 text-gold" /> 2. Trajet et dates
        </legend>
        <div className="grid gap-5 md:grid-cols-4">
          <TextField label="Date de début" name="startDate" type="date" min={today} required={isReservation} state={state} className="md:col-span-1" />
          <TextField label="Heure" name="startTime" type="time" state={state} />
          <TextField label="Date de fin" name="endDate" type="date" min={today} state={state} />
          <TextField label="Heure de fin" name="endTime" type="time" state={state} />
          <TextField label="Lieu de prise en charge" name="pickup" required={isReservation} placeholder="Ex. Aéroport AIBD, Almadies…" state={state} className="md:col-span-2" />
          <TextField
            label="Destination"
            name="destination"
            placeholder={serviceType === "interurbain" ? "Ex. Saint-Louis" : "Ex. Plateau, Diamniadio…"}
            list={serviceType === "interurbain" ? "destinations" : undefined}
            state={state}
            className="md:col-span-2"
          />
          <datalist id="destinations">
            {INTERCITY_DESTINATIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <TextField label="Nombre de passagers" name="passengers" type="number" min={1} max={80} inputMode="numeric" state={state} />
          <TextField label="Durée estimée" name="duration" placeholder="Ex. 1 journée, 3 jours, 2 heures" state={state} className="md:col-span-3" />
          <TextAreaField
            label="Détails de la demande"
            name="details"
            placeholder="Programme, étapes, bagages, besoins particuliers…"
            state={state}
            className="md:col-span-4"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-2xl border border-border p-5 md:p-7">
        <legend className="flex items-center gap-2 px-2 text-base font-semibold">
          <UserRound className="size-5 text-gold" /> 3. Vos coordonnées
        </legend>
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            label="Vous êtes"
            name="accountType"
            state={state}
            options={ACCOUNT_TYPES}
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            defaultValue={undefined}
          />
          <TextField label="Nom complet" name="contactName" required autoComplete="name" defaultValue={defaults.contactName} state={state} />
          <TextField label="E-mail" name="email" type="email" required autoComplete="email" defaultValue={defaults.email} state={state} />
          <TextField label="Téléphone" name="phone" type="tel" required autoComplete="tel" placeholder="+221 …" defaultValue={defaults.phone} state={state} />
          {accountType !== "particulier" && (
            <>
              <TextField label="Nom de la structure" name="companyName" required defaultValue={defaults.companyName} state={state} />
              <TextField label="Votre fonction" name="companyRole" state={state} />
              <TextAreaField label="Informations de facturation" name="billingInfo" placeholder="Raison sociale, NINEA, adresse de facturation…" state={state} className="md:col-span-2" />
            </>
          )}
        </div>
        <CheckboxField
          name="consent"
          label="J'accepte que SENTRAJET PREMIUM utilise ces informations pour traiter ma demande."
          hint="Vos données ne sont jamais revendues. Voir notre politique de confidentialité."
        />
      </fieldset>

      <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          L&apos;envoi crée une demande avec une référence unique. La réservation est confirmée après vérification par notre équipe.{" "}
          <Link href="/confidentialite" className="underline">
            Confidentialité
          </Link>
        </p>
        <SubmitButton className="h-12 px-8 text-base">{isReservation ? "Envoyer ma demande" : "Demander mon devis"}</SubmitButton>
      </div>
    </form>
  );
}
