"use client"

import { useState } from "react"
import { SenTrajetMark } from "@/components/sen-trajet-mark"
import { SimAccounts } from "@/components/sim-accounts"
import { Button } from "@/components/ui/button"

const steps = ["Bienvenue", "Essai", "Profils"]

export function WelcomeFlow() {
  const [step, setStep] = useState(0)

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
        <SenTrajetMark />
        <p className="mt-8 text-sm text-muted-foreground">
          {step + 1} / {steps.length}
        </p>

        {step === 0 ? (
          <div className="flex flex-1 flex-col justify-end gap-6 pb-4">
            <h1 className="font-display text-5xl leading-[1.02] text-balance">La route, sans négocier au feu.</h1>
            <p className="text-lg text-muted-foreground">
              Courses immédiates à Dakar. Sièges réservés vers Thiès, Mbour et Touba. Le prix en francs CFA est fixé avant de monter.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-1 flex-col justify-end gap-4 pb-4">
            <h1 className="font-display text-4xl leading-tight">Trois gestes pour essayer.</h1>
            <ol className="flex flex-col gap-3">
              {[
                ["Le profil", "Awa est passagère. Moussa est chauffeur. Chacun ouvre sa propre session."],
                ["La course", "Départ, arrivée, Éco. Le prix reste celui qui est affiché."],
                ["Le siège", "Un départ publié, une place, un paiement. Le départ part même si la voiture n’est pas pleine."],
              ].map(([title, body], index) => (
                <li key={title} className="rounded-3xl border border-border bg-card px-4 py-4">
                  <span className="font-display text-2xl text-primary">{index + 1}</span>
                  <h2 className="mt-1 font-medium">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-1 flex-col justify-end gap-4 pb-2">
            <h1 className="font-display text-4xl leading-tight">Choisissez un profil.</h1>
            <SimAccounts next="/app" />
          </div>
        ) : null}

        {step < 2 ? (
          <Button size="xl" className="mt-6 w-full" onClick={() => setStep((current) => current + 1)}>
            Suivant
          </Button>
        ) : null}
      </div>
    </div>
  )
}
