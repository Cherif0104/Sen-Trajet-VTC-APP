import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function FocusBar({ title, back = "/app" }: { title: string; back?: string }) {
  return (
    <header className="flex items-center gap-2">
      <Link href={back} aria-label="Retour" className={buttonVariants({ variant: "ghost", size: "icon" })}>
        <ArrowLeftIcon />
      </Link>
      <h1 className="font-display text-2xl tracking-tight">{title}</h1>
    </header>
  )
}
