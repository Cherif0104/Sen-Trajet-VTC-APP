import type { Metadata } from "next"
import { DriverSignup } from "@/components/driver-signup"

export const metadata: Metadata = { title: "Inscription chauffeur" }

export default function DriverSignupPage() {
  return <DriverSignup />
}
