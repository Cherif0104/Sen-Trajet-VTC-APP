import Image from "next/image"
import Link from "next/link"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { buttonVariants } from "@/components/ui/button"

const frames = [
  { src: "/welcome/sieges.jpg", alt: "Sièges clairs, ceinture corail", label: "Les sièges" },
  { src: "/welcome/route.jpg", alt: "Route sarcelle vers un point corail", label: "La route" },
]

export function WelcomeFlow() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-4 pb-6">
        <div className="relative h-[42vh] min-h-64 overflow-hidden rounded-[1.75rem]">
          <Image
            src="/welcome/hero.jpg"
            alt="Voiture sur la corniche, mer sarcelle"
            fill
            priority
            sizes="(min-width: 32rem) 32rem, 100vw"
            className="object-cover"
          />
          <div className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-2">
            <SenTrajetMark />
          </div>
        </div>

        <div className="flex flex-1 flex-col pt-6">
          <h1 className="font-display text-5xl leading-[1.02] text-balance">Où allez-vous ?</h1>
          <p className="mt-3 text-lg text-muted-foreground">Le prix est fixé avant de monter.</p>

          <div className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-1">
            {frames.map((frame) => (
              <figure key={frame.src} className="w-36 shrink-0">
                <Image
                  src={frame.src}
                  alt={frame.alt}
                  width={288}
                  height={288}
                  className="h-36 w-36 rounded-3xl object-cover"
                />
                <figcaption className="mt-2 text-sm font-medium">{frame.label}</figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-6">
            <Link href="/connexion?tab=signup" className={buttonVariants({ size: "xl" })}>
              Créer un compte
            </Link>
            <Link href="/connexion" className={buttonVariants({ variant: "outline", size: "xl" })}>
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
