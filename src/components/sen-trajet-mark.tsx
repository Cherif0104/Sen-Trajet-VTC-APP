import { cn } from "cn"

export function SenTrajetMark({ className, word = true }: { className?: string; word?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#0B0B0C" />
        <rect x="1" y="1" width="30" height="30" rx="8" fill="none" stroke="#D4AF37" strokeWidth="1.5" />
        <path
          d="M8 22.5c3.6-6.4 5.4-9.6 8-9.6s4.4 3.2 8 9.6"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <circle cx="16" cy="12.9" r="2" fill="#D4AF37" />
      </svg>
      {word ? (
        <span className="font-display text-lg leading-none tracking-tight">
          Sen Trajet
          <span className="mt-1 block font-sans text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Sénégal
          </span>
        </span>
      ) : null}
    </span>
  )
}
