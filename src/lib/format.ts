const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function fcfa(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `${nf.format(amount).replace(/\u202f|\u00a0/g, " ")} FCFA`;
}

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return nf.format(n).replace(/\u202f|\u00a0/g, " ");
}

const TZ = "Africa/Dakar";

export function fdate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length === 10 ? `${value}T12:00:00Z` : value) : value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
}

export function fdatetime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function waLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
