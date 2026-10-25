import { Suspense } from "react"
import type { Metadata } from "next"
import { Rubik_Wet_Paint } from "next/font/google"
import { ConnexionForm } from "@/components/connexion-form"

const brush = Rubik_Wet_Paint({ weight: "400", subsets: ["latin"] })

export const metadata: Metadata = { title: "Connexion" }

export default function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; tab?: string }>
}) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted-foreground">Ouverture de la connexion…</p>}>
      <ConnexionGate searchParams={searchParams} />
    </Suspense>
  )
}

async function ConnexionGate({ searchParams }: { searchParams: Promise<{ next?: string; tab?: string }> }) {
  const params = await searchParams
  return <ConnexionForm next={params.next ?? "/app"} tab={params.tab} brushClass={brush.className} />
}
