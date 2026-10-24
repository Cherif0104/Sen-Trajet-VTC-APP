import { Suspense } from "react"
import type { Metadata } from "next"
import { BookRide } from "@/components/book-ride"

export const metadata: Metadata = { title: "Course" }

export default function CoursePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-muted-foreground">Ouverture de la course…</p>}>
      <CourseGate searchParams={searchParams} />
    </Suspense>
  )
}

async function CourseGate({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams
  return <BookRide fromId={params.from} toId={params.to} />
}
