"use client"

import { Button } from "@/components/ui/button"

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-10">
      <h1 className="font-display text-3xl">L’écran n’a pas pu s’ouvrir.</h1>
      <p className="text-muted-foreground">{error.message || "Réessayez dans un instant."}</p>
      <Button size="xl" onClick={reset}>
        Réessayer
      </Button>
    </div>
  )
}
