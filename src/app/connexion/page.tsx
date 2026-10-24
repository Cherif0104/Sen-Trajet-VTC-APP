import { Suspense } from "react"
import type { Metadata } from "next"
import { ConnexionForm } from "@/components/connexion-form"

export const metadata: Metadata = { title: "Connexion" }

export default function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted-foreground">Ouverture de la connexion…</p>}>
      <ConnexionGate searchParams={searchParams} />
    </Suspense>
  )
}

async function ConnexionGate({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams
  return <ConnexionForm next={params.next ?? "/app"} />
}
