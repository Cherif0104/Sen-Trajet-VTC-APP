import { Suspense } from "react"
import type { Metadata } from "next"
import { RideLive } from "@/components/ride-live"

export const metadata: Metadata = { title: "Suivi" }

export default function RidePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted-foreground">Ouverture du suivi…</p>}>
      <RideGate params={params} />
    </Suspense>
  )
}

async function RideGate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RideLive id={id} />
}
