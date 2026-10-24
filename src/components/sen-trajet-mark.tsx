import { cn } from "cn"

export function SenTrajetMark({ className, word = true }: { className?: string; word?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#121417" />
        <path
          d="M7 22.5c3.2 0 4.2-10 8-10s4.8 10 9 10"
          fill="none"
          stroke="#0E8C78"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="22.5" r="2.3" fill="#FF4D2A" />
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
