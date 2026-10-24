import { cn } from "cn"

export function YoonMark({ className, word = true }: { className?: string; word?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="currentColor" className="text-accent" />
        <path
          d="M8 23.5 16 9.5 24 23.5"
          fill="none"
          stroke="#F4F1EB"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="9.5" r="2.1" fill="#E23A12" />
      </svg>
      {word ? (
        <span className="font-display text-xl leading-none tracking-tight">
          Yoon
          <span className="mt-0.5 block font-sans text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            sama yoon
          </span>
        </span>
      ) : null}
    </span>
  )
}
