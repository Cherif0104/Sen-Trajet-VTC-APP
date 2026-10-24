import { Suspense } from "react"
import type { Metadata } from "next"
import { CarpoolSearch } from "@/components/carpool-search"

export const metadata: Metadata = { title: "Sièges" }

export default function CarpoolPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string }>
}) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted-foreground">Recherche des sièges…</p>}>
      <CarpoolGate searchParams={searchParams} />
    </Suspense>
  )
}

async function CarpoolGate({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; date?: string }>
}) {
  const params = await searchParams
  return <CarpoolSearch fromId={params.from} toId={params.to} date={params.date} />
}
