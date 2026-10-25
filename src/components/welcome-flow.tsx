import Image from "next/image"
import Link from "next/link"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { buttonVariants } from "@/components/ui/button"

export function WelcomeFlow() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <section className="relative">
          <div className="relative h-[58svh] min-h-80">
            <Image
              src="/welcome/affiche.jpg"
              alt="Rue de Dakar, mur en wax, voiture claire vers la mer"
              fill
              priority
              sizes="(min-width: 32rem) 32rem, 100vw"
              className="object-cover object-[center_72%]"
            />
            <div className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-2">
              <SenTrajetMark />
            </div>
            <figure className="absolute right-4 -bottom-10 z-20 w-[7.25rem] rotate-2 overflow-hidden rounded-2xl border-4 border-white shadow-[0_12px_30px_rgba(18,20,23,0.16)]">
              <Image
                src="/welcome/siege.jpg"
                alt="Siège crème, appuie-tête en wax, corniche par la vitre"
                width={448}
                height={560}
                className="h-36 w-full object-cover object-left"
              />
            </figure>
          </div>
          <div className="relative h-14 w-full overflow-hidden">
            <Image
              src="/welcome/wax.jpg"
              alt=""
              fill
              sizes="(min-width: 32rem) 32rem, 100vw"
              className="object-cover object-[center_42%]"
            />
          </div>
        </section>

        <div className="flex flex-1 flex-col px-5 pt-6 pb-6">
          <p className="text-[0.7rem] font-semibold tracking-[0.22em] text-accent uppercase">
            Dakar · Thiès · Touba
          </p>
          <h1 className="mt-2 max-w-[16rem] font-display text-[3.35rem] leading-[0.88] tracking-tight">
            Sans
            <br />
            marchander.
          </h1>
          <p className="mt-4 max-w-[16rem] text-lg leading-snug">Le prix est fixé avant de monter.</p>

          <div className="mt-auto flex flex-col gap-3 pt-8">
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
