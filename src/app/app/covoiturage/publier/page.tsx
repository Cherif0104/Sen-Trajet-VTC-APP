import type { Metadata } from "next"
import { CarpoolPublish } from "@/components/carpool-publish"

export const metadata: Metadata = { title: "Publier un départ" }

export default function PublishPage() {
  return <CarpoolPublish />
}
