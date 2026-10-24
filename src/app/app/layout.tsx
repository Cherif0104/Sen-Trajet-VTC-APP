import { Suspense } from "react"
import { AppFrame } from "@/components/app-frame"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <AppFrame>{children}</AppFrame>
    </Suspense>
  )
}
