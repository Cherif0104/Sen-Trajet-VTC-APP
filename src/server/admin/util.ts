import "server-only";
import { assertPermission, type CurrentUser } from "../auth";
import { fail, type ActionState } from "@/lib/action-state";
import type { Permission } from "@/lib/permissions";

export class UserError extends Error {}

export const str = (fd: FormData, key: string): string | null => {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

export const req = (fd: FormData, key: string, label: string): string => {
  const v = str(fd, key);
  if (!v) throw new UserError(`${label} est obligatoire.`, { cause: key });
  return v;
};

export const int = (fd: FormData, key: string): number | null => {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) throw new UserError("Valeur numérique invalide.", { cause: key });
  return Math.round(n);
};

export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true" || fd.get(key) === "1";

export const oneOf = <T extends string>(fd: FormData, key: string, list: readonly { value: T }[], fallback?: T): T => {
  const v = str(fd, key);
  const found = list.find((o) => o.value === v);
  if (found) return found.value;
  if (fallback !== undefined) return fallback;
  throw new UserError("Valeur non autorisée.", { cause: key });
};

export const dateOrNull = (fd: FormData, key: string): string | null => {
  const v = str(fd, key);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new UserError("Date invalide.", { cause: key });
  return v;
};

export const datetimeOrNull = (fd: FormData, key: string): Date | null => {
  const v = str(fd, key);
  if (!v) return null;
  // Les champs datetime-local sont saisis à l'heure de Dakar (UTC+0).
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(v) ? v : `${v}Z`);
  if (Number.isNaN(d.getTime())) throw new UserError("Date et heure invalides.", { cause: key });
  return d;
};

/**
 * Enveloppe une Server Action d'administration : vérifie la permission côté serveur,
 * convertit les erreurs métier en message de formulaire.
 */
export function adminAction(permission: Permission, fn: (user: CurrentUser, fd: FormData) => Promise<ActionState | void>) {
  return async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
    const user = await assertPermission(permission);
    try {
      return (await fn(user, fd)) ?? { ok: true, message: "Modifications enregistrées." };
    } catch (e) {
      if (e instanceof UserError) {
        const field = typeof e.cause === "string" ? e.cause : undefined;
        return fail(fd, e.message, field ? { [field]: e.message } : undefined);
      }
      if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
      console.error(e);
      return fail(fd, "Une erreur est survenue. Réessayez ou contactez l'administrateur.");
    }
  };
}

export type SimpleResult = { ok: boolean; message?: string };

/** Variante pour les actions déclenchées par bouton (FormData) : renvoie un message plutôt que de lever une erreur. */
export function buttonAction(permission: Permission, fn: (user: CurrentUser, fd: FormData) => Promise<SimpleResult | void>) {
  return async (fd: FormData): Promise<SimpleResult> => {
    const user = await assertPermission(permission);
    try {
      return (await fn(user, fd)) ?? { ok: true };
    } catch (e) {
      if (e instanceof UserError) return { ok: false, message: e.message };
      if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
      console.error(e);
      return { ok: false, message: "Une erreur est survenue." };
    }
  };
}
