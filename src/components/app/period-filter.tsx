export function PeriodFilter({ action, from, to, extra }: { action: string; from: string; to: string; extra?: React.ReactNode }) {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const presets = [
    { label: "Ce mois", from: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to: iso(now) },
    {
      label: "Mois dernier",
      from: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))),
      to: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))),
    },
    { label: "Cette année", from: `${now.getUTCFullYear()}-01-01`, to: iso(now) },
  ];
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 md:flex-row md:items-end">
      <form action={action} className="flex flex-1 flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Du</span>
          <input type="date" name="from" defaultValue={from} className="h-10 rounded-lg border border-input px-3" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">Au</span>
          <input type="date" name="to" defaultValue={to} className="h-10 rounded-lg border border-input px-3" />
        </label>
        <button type="submit" className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-gold-light hover:bg-graphite">
          Appliquer
        </button>
        <span className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <a key={p.label} href={`${action}?from=${p.from}&to=${p.to}`} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-gold">
              {p.label}
            </a>
          ))}
        </span>
      </form>
      {extra}
    </div>
  );
}
