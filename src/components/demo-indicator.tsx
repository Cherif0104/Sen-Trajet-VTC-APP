import { Badge } from "@/components/ui/badge"

export function FleetBadge({ launchFleet }: { launchFleet: boolean }) {
  return launchFleet ? (
    <Badge variant="outline">Démonstration</Badge>
  ) : (
    <Badge variant="outline">Indépendant</Badge>
  )
}

export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
      <span className="font-medium text-primary">Démonstration. </span>
      {children}
    </p>
  )
}
