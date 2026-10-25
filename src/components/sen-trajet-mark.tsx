import { useId } from "react"
import { cn } from "cn"

export function SenTrajetMark({ className, word = true }: { className?: string; word?: boolean }) {
  const clipId = useId().replace(/:/g, "")
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 512 512" className="size-8 shrink-0" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <rect width="512" height="512" rx="118" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect width="512" height="512" fill="#FF4D2A" />
          <path
            d="M-48 368C148 392 156 124 292 152C400 174 412 300 424 328"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="64"
            strokeLinecap="round"
          />
          <circle cx="424" cy="328" r="56" fill="#FFFFFF" />
        </g>
      </svg>
      {word ? (
        <span className="text-lg leading-none font-semibold tracking-tight">
          Sen Trajet
          <span className="mt-1 block text-[10px] font-medium tracking-[0.18em] text-accent uppercase">
            Sénégal
          </span>
        </span>
      ) : null}
    </span>
  )
}
