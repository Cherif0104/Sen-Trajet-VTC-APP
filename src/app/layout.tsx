import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const sans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
})

export const metadata: Metadata = {
  title: {
    default: "Sen Trajet — courses et covoiturage au Sénégal",
    template: "%s · Sen Trajet",
  },
  description:
    "Courses immédiates à Dakar et sièges réservés vers Thiès, Mbour, Touba et Saint-Louis. Le prix est fixé avant de monter.",
  applicationName: "Sen Trajet",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Sen Trajet",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
