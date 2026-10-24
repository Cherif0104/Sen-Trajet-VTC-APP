import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  )
}
