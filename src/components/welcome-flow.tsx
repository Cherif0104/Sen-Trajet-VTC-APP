import Link from "next/link"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { buttonVariants } from "@/components/ui/button"

export function WelcomeFlow() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-between px-5 py-8">
        <SenTrajetMark />
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-5xl leading-[1.02] text-balance">Où allez-vous ?</h1>
          <p className="text-lg text-muted-foreground">Le prix est fixé avant de monter.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/connexion?tab=signup" className={buttonVariants({ size: "xl" })}>
            Créer un compte
          </Link>
          <Link href="/connexion" className={buttonVariants({ variant: "outline", size: "xl" })}>
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  )
}
