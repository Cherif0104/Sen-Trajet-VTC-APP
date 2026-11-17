import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneOf, type Tone } from "@/lib/domain";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink">
          <ChevronLeft className="size-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const TONES: Record<Tone, string> = {
  gold: "bg-gold/15 text-[#8a6519] ring-gold/30",
  muted: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({ tone = "muted", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ list, value }: { list: readonly { value: string; label: string; tone: string }[]; value: string }) {
  const item = list.find((o) => o.value === value);
  return <Badge tone={toneOf(list, value)}>{item?.label ?? value}</Badge>;
}

export function Card({ children, className, title, actions }: { children: React.ReactNode; className?: string; title?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href, icon }: { label: string; value: React.ReactNode; hint?: string; href?: string; icon?: React.ReactNode }) {
  const inner = (
    <div className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-white p-5 transition-colors hover:border-gold/60">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-semibold tracking-tight md:text-3xl">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-6 py-14 text-center">
      <Inbox className="size-8 text-gold" />
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-md text-sm text-muted-foreground">{text}</p>}
      {action}
    </div>
  );
}

export function KeyValues({ items, className }: { items: [string, React.ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {items
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-sm font-medium break-words">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: { key: string; href?: string; cells: Record<string, React.ReactNode> }[];
  empty?: React.ReactNode;
}) {
  if (rows.length === 0) return <>{empty ?? <EmptyState title="Aucun élément" />}</>;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-mist/70 text-left text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 font-medium", c.className)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.key} className={cn("align-middle", r.href && "relative cursor-pointer hover:bg-accent/40")}>
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("px-4 py-3", c.className)}>
                    {i === 0 && r.href ? (
                      <Link href={r.href} className="font-medium after:absolute after:inset-0 hover:text-gold">
                        {r.cells[c.key]}
                      </Link>
                    ) : (
                      r.cells[c.key]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FilterBar({
  action,
  q,
  placeholder = "Rechercher…",
  children,
}: {
  action: string;
  q?: string;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className="mb-4 flex flex-col gap-2 sm:flex-row">
      <label className="relative flex-1">
        <span className="sr-only">Rechercher</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder={placeholder} className="h-10 w-full rounded-lg border border-input bg-white pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40" />
      </label>
      {children}
      <button type="submit" className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-gold-light hover:bg-graphite">
        Filtrer
      </button>
    </form>
  );
}

export function FilterSelect({ name, value, options, placeholder }: { name: string; value?: string; options: readonly { value: string; label: string }[]; placeholder: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} className="h-10 rounded-lg border border-input bg-white px-3 text-sm">
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Pagination({ page, pageCount, makeHref }: { page: number; pageCount: number; makeHref: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
      <span className="text-muted-foreground">
        Page {page} sur {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={makeHref(page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-white px-3 hover:border-ink">
            <ChevronLeft className="size-4" /> Précédent
          </Link>
        )}
        {page < pageCount && (
          <Link href={makeHref(page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-white px-3 hover:border-ink">
            Suivant <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}

export function Timeline({ items }: { items: { id: string; title: React.ReactNode; meta: string; note?: string | null }[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Aucun historique.</p>;
  return (
    <ol className="relative space-y-5 border-l border-border pl-5">
      {items.map((it) => (
        <li key={it.id} className="relative">
          <span className="absolute top-1 -left-[1.6rem] size-3 rounded-full border-2 border-white bg-gold ring-1 ring-gold/40" />
          <p className="text-sm font-medium">{it.title}</p>
          <p className="text-xs text-muted-foreground">{it.meta}</p>
          {it.note && <p className="mt-1 text-sm text-graphite/80">{it.note}</p>}
        </li>
      ))}
    </ol>
  );
}
