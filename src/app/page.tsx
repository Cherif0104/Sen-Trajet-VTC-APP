import { Suspense } from "react"
import Link from "next/link"
import { connection } from "next/server"
import { ArrowRightIcon, ShieldCheckIcon, TimerIcon, WalletIcon } from "lucide-react"
import { FareCard } from "@/components/fare-card"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { buttonVariants } from "@/components/ui/button"
import { measureFallback, priceRoute } from "@/lib/domain"
import { fcfa } from "@/lib/format"
import { placeById } from "@/lib/places"

async function SampleFare() {
  await connection()
  const pickup = placeById("sacre-coeur")
  const dropoff = placeById("almadies")
  const sample =
    pickup && dropoff
      ? priceRoute(
          "eco",
          measureFallback(pickup, dropoff).distanceM,
          measureFallback(pickup, dropoff).durationS,
          pickup,
          dropoff,
          new Date(),
        )
      : null
  return (
    <FareCard
      eyebrow="Exemple Éco · Sacré-Cœur → Almadies · heure de Dakar"
      amount={sample ? fcfa(sample.fare) : "—"}
      detail={sample?.surgeLabel ?? "Prix fixe, commission 12 % affichée au chauffeur."}
      note="La même carte sert à l’écran de réservation. Ce que vous voyez est ce que vous payez."
    />
  )
}

const corridors = [
  { from: "Dakar", to: "Thiès", price: "2 000 F" },
  { from: "Dakar", to: "Mbour · Saly", price: "2 500 F" },
  { from: "Dakar", to: "Touba", price: "5 000 F" },
  { from: "Dakar", to: "Saint-Louis", price: "6 000 F" },
  { from: "Dakar", to: "Kaolack", price: "4 500 F" },
  { from: "Dakar", to: "Rufisque", price: "1 000 F" },
  { from: "Dakar", to: "AIBD", price: "3 000 F" },
]

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <Marketing />
    </div>
  )
}

function Marketing() {
  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <SenTrajetMark />
          <div className="flex items-center gap-2">
            <Link href="/connexion" className={buttonVariants({ variant: "ghost", size: "lg" })}>
              Connexion
            </Link>
            <Link href="/app/course" className={buttonVariants({ size: "lg" })}>
              Demander
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] md:items-end md:py-20">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-medium tracking-[0.16em] text-accent uppercase">
              Dakar · Thiès · Mbour · Touba
            </p>
            <h1 className="max-w-xl font-display text-5xl leading-[1.02] text-balance md:text-7xl">
              La route, sans négocier au feu.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Sen Trajet relie une course immédiate et un siège réservé. Le prix en francs CFA est verrouillé avant le départ.
              Le chauffeur voit ce qu’il garde. Personne ne valide la course à la main.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/app/course" className={buttonVariants({ size: "xl" })}>
                Demander une course
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
              <Link href="/app/covoiturage" className={buttonVariants({ variant: "secondary", size: "xl" })}>
                Réserver un siège
              </Link>
            </div>
          </div>
          <Suspense
            fallback={
              <FareCard eyebrow="Exemple Éco · Sacré-Cœur → Almadies · heure de Dakar" amount="…" />
            }
          >
            <SampleFare />
          </Suspense>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-2">
          <article className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
            <TimerIcon className="text-primary" />
            <h2 className="font-display text-3xl">Course immédiate</h2>
            <p className="text-muted-foreground">
              Jakarta, Éco, Confort ou 7 places. Un chauffeur libre est affecté tout seul, le plus proche d’abord.
              Un indépendant en ligne passe devant le réseau de démonstration.
            </p>
          </article>
          <article className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
            <ShieldCheckIcon className="text-accent" />
            <h2 className="font-display text-3xl">Siège réservé</h2>
            <p className="text-muted-foreground">
              Le chauffeur publie Dakar → Thiès, Mbour, Touba. Vous prenez un ou plusieurs sièges. Le départ est tenu
              même si la voiture n’est pas pleine — contrairement à la gare routière.
            </p>
          </article>
        </section>

        <section className="bg-card">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16">
            <h2 className="font-display text-4xl">Trois gestes, pas un formulaire.</h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                ["Le trajet", "Départ, arrivée, et le prix de chaque véhicule."],
                ["Le véhicule", "Éco pour le quotidien, 7 places pour l’aéroport, Trajet Serein si vous le demandez."],
                ["Le paiement", "Wave, Orange Money, Free Money, portefeuille Sen Trajet ou espèces. Puis le suivi sur la carte."],
              ].map(([title, body], index) => (
                <li key={title} className="flex flex-col gap-2 rounded-2xl bg-background p-5">
                  <span className="font-display text-3xl text-primary">{index + 1}</span>
                  <h3 className="text-lg font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-4xl">Les corridors, au siège.</h2>
            <p className="max-w-xl text-muted-foreground">
              Prix suggéré par personne. Le chauffeur peut l’ajuster dans une fourchette, pas le doubler la veille d’un Magal.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {corridors.map((item) => (
              <li key={item.to} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
                <span>
                  {item.from} → {item.to}
                </span>
                <span className="font-medium">{item.price}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-4xl">12 % pour Sen Trajet. Le reste pour la route.</h2>
            <p className="text-muted-foreground">
              12 % sur Éco, Confort et 7 places. 10 % sur le Jakarta et le covoiturage. La commission est écrite avant
              d’accepter. Une plaque au format sénégalais et un mobile +221 suffisent pour être vérifié et passer en ligne.
            </p>
            <p className="text-muted-foreground">
              Trajet Serein : vous demandez une conductrice. S’il n’y en a pas à proximité, Sen Trajet le dit. On ne vous envoie
              pas quelqu’un d’autre en silence.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl bg-secondary p-6 text-secondary-foreground">
            <WalletIcon />
            <h2 className="font-display text-3xl">L’argent local, sans caisse manuelle.</h2>
            <p>
              Wave, Orange Money et Free Money se confirment automatiquement. En pré-production, aucun débit réel :
              le même parcours branchera le webhook marchand. Les espèces restent possibles. Le portefeuille Sen Trajet sert
              aux courses, aux sièges et aux remboursements.
            </p>
            <p className="text-sm">
              Annulation gratuite avant l’arrivée du chauffeur. 500 F après. Siège remboursé en totalité plus de deux
              heures avant le départ.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Sen Trajet · Sénégal · Dakar, heure du Sénégal</p>
          <Link href="/connexion" className="text-foreground underline-offset-4 hover:underline">
            Essayer avec un compte de démonstration
          </Link>
        </div>
      </footer>
    </div>
  )
}
