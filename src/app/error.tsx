"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl font-semibold">Une erreur est survenue</h1>
      <p className="max-w-md text-muted-foreground">Le service n&apos;a pas pu répondre. Réessayez dans un instant ; si le problème persiste, contactez-nous.</p>
      <Button onClick={reset} className="h-11 px-6">
        Réessayer
      </Button>
    </main>
  );
}
