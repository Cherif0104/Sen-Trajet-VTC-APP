import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Fraunces } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const sans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
})

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
})

export const metadata: Metadata = {
  title: {
    default: "Yoon — courses et covoiturage au Sénégal",
    template: "%s · Yoon",
  },
  description:
    "Courses immédiates à Dakar et sièges réservés vers Thiès, Mbour, Touba et Saint-Louis. Le prix est fixé avant de monter.",
  applicationName: "Yoon",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Yoon",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#0E6E68",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
