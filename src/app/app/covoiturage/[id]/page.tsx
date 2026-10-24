import { Suspense } from "react"
import type { Metadata } from "next"
import { CarpoolDetail } from "@/components/carpool-detail"

export const metadata: Metadata = { title: "Départ" }

export default function CarpoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted-foreground">Ouverture du départ…</p>}>
      <DetailGate params={params} />
    </Suspense>
  )
}

async function DetailGate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CarpoolDetail id={id} />
}
