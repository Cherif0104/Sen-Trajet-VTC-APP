import { Suspense } from "react"
import type { Metadata } from "next"
import { BookRide } from "@/components/book-ride"
import { placeById, toPoint, type GeoPoint } from "@/lib/places"

export const metadata: Metadata = { title: "Course" }

type Query = {
  from?: string
  to?: string
  fromLat?: string
  fromLng?: string
  fromLabel?: string
  fromCity?: string
  toLat?: string
  toLng?: string
  toLabel?: string
  toCity?: string
}

function readPoint(params: Query, prefix: "from" | "to"): GeoPoint | null {
  const lat = Number(params[`${prefix}Lat`])
  const lng = Number(params[`${prefix}Lng`])
  const label = params[`${prefix}Label`]
  if (label && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { label, city: params[`${prefix}City`] || "Sénégal", lat, lng }
  }
  const id = prefix === "from" ? params.from : params.to
  const place = id ? placeById(id) : null
  return place ? toPoint(place) : null
}

export default function CoursePage({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted-foreground">Ouverture de la course…</p>}>
      <CourseGate searchParams={searchParams} />
    </Suspense>
  )
}

async function CourseGate({ searchParams }: { searchParams: Promise<Query> }) {
  const params = await searchParams
  return <BookRide initialPickup={readPoint(params, "from")} initialDropoff={readPoint(params, "to")} />
}
