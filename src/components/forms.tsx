"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { initialState, type ActionState } from "@/lib/action-state";

const FormStateContext = createContext<ActionState | undefined>(undefined);
export function useFormState(explicit?: ActionState) {
  const ctx = useContext(FormStateContext);
  return explicit ?? ctx;
}

/**
 * Formulaire générique pour Server Actions : partage l'état (erreurs, valeurs) avec les champs,
 * affiche le message global et peut réinitialiser ou rediriger après succès.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  toastOnSuccess = true,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  toastOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      if (toastOnSuccess && state.message) toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, resetOnSuccess, toastOnSuccess, router]);
  return (
    <FormStateContext value={state}>
      <form ref={ref} action={formAction} className={className} noValidate>
        {!state.ok && <FormMessage state={state} />}
        {children}
      </form>
    </FormStateContext>
  );
}

export function FormField({
  label,
  name,
  error,
  hint,
  required,
  className,
  children,
  htmlFor,
}: {
  label: string;
  name: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor ?? name} className="text-sm font-medium text-graphite">
        {label}
        {required && <span className="text-gold"> *</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor ?? name}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type Common = {
  label: string;
  name: string;
  state?: ActionState;
  required?: boolean;
  hint?: string;
  className?: string;
  defaultValue?: string | number | null;
};

const fieldClass = "h-11 rounded-lg bg-white text-[0.95rem]";

export function TextField({
  label,
  name,
  state,
  required,
  hint,
  className,
  defaultValue,
  ...props
}: Common & Omit<React.ComponentProps<"input">, "name" | "defaultValue">) {
  state = useFormState(state);
  const uid = useId();
  const fid = `${name}-${uid}`;
  const error = state?.errors?.[name];
  return (
    <FormField label={label} name={name} htmlFor={fid} error={error} hint={hint} required={required} className={className}>
      <Input
        id={fid}
        name={name}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-error` : undefined}
        defaultValue={state?.values?.[name] ?? (defaultValue ?? undefined) ?? undefined}
        className={fieldClass}
        {...props}
      />
    </FormField>
  );
}

export function TextAreaField({
  label,
  name,
  state,
  required,
  hint,
  className,
  defaultValue,
  ...props
}: Common & Omit<React.ComponentProps<"textarea">, "name" | "defaultValue">) {
  state = useFormState(state);
  const uid = useId();
  const fid = `${name}-${uid}`;
  const error = state?.errors?.[name];
  return (
    <FormField label={label} name={name} htmlFor={fid} error={error} hint={hint} required={required} className={className}>
      <Textarea
        id={fid}
        name={name}
        required={required}
        aria-invalid={!!error || undefined}
        defaultValue={state?.values?.[name] ?? (defaultValue ?? undefined) ?? undefined}
        className="min-h-28 rounded-lg bg-white text-[0.95rem]"
        {...props}
      />
    </FormField>
  );
}

export function SelectField({
  label,
  name,
  state,
  required,
  hint,
  className,
  defaultValue,
  options,
  placeholder,
  ...props
}: Common & {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
} & Omit<React.ComponentProps<"select">, "name" | "defaultValue">) {
  state = useFormState(state);
  const uid = useId();
  const fid = `${name}-${uid}`;
  const error = state?.errors?.[name];
  return (
    <FormField label={label} name={name} htmlFor={fid} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        <select
          id={fid}
          name={name}
          required={required}
          aria-invalid={!!error || undefined}
          defaultValue={
            props.value !== undefined ? undefined : (state?.values?.[name] ?? (defaultValue === null || defaultValue === undefined ? "" : String(defaultValue)))
          }
          className={cn(
            "h-11 w-full appearance-none rounded-lg border border-input bg-white pr-9 pl-3 text-[0.95rem] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
          )}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </FormField>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  hint,
  value = "on",
}: {
  label: React.ReactNode;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
  value?: string;
}) {
  const state = useFormState();
  const checked = state?.values ? state.values[name] === value : defaultChecked;
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input bg-white p-3 text-sm has-[:checked]:border-gold has-[:checked]:bg-accent">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} key={String(checked)} className="mt-0.5 size-4 accent-[#C99A32]" />
      <span>
        <span className="font-medium text-graphite">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Envoi en cours…",
  className,
  variant,
  size,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} name={name} value={value} className={cn("h-11 px-5 font-semibold", className)}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm",
        state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {state.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      <span>{state.message}</span>
    </div>
  );
}

export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Ne pas remplir
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
