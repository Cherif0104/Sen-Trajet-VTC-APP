export function FareCard({
  eyebrow,
  amount,
  detail,
  note,
}: {
  eyebrow: string
  amount: string
  detail?: string | null
  note?: string
}) {
  return (
    <aside className="rounded-3xl border border-border bg-card px-5 py-5">
      <p className="text-sm text-muted-foreground">{eyebrow}</p>
      <p className="mt-2 font-display text-5xl tabular-nums tracking-tight text-primary">{amount}</p>
      {detail ? <p className="mt-2 text-sm">{detail}</p> : null}
      {note ? <p className="mt-4 text-sm text-muted-foreground">{note}</p> : null}
    </aside>
  )
}
