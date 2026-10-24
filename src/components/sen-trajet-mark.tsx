import { cn } from "cn"

export function SenTrajetMark({ className, word = true }: { className?: string; word?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#FF4D2A" />
        <path
          d="M8 22.5c3.6-6.4 5.4-9.6 8-9.6s4.4 3.2 8 9.6"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="12.6" r="2" fill="#FFFFFF" />
      </svg>
      {word ? (
        <span className="text-lg leading-none font-semibold tracking-tight">
          Sen Trajet
          <span className="mt-1 block text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Sénégal
          </span>
        </span>
      ) : null}
    </span>
  )
}
