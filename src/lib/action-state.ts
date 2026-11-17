import type { ZodError } from "zod";

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
  redirectTo?: string;
};

export const initialState: ActionState = {};

export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && !k.startsWith("$") && k !== "password" && k !== "confirm") out[k] = v;
  }
  return out;
}

export function zodErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function fail(fd: FormData, message: string, errors?: Record<string, string>): ActionState {
  return { ok: false, message, errors, values: formValues(fd) };
}
