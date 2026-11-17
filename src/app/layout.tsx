import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SENTRAJET PREMIUM — Location de véhicules avec chauffeur au Sénégal",
    template: "%s · SENTRAJET PREMIUM",
  },
  description:
    "SENTRAJET PREMIUM, marque d'IMPULCIA AFRIQUE : location de véhicules avec chauffeur, solutions corporate, transport de groupes, voyages interurbains et missions terrain au Sénégal.",
  applicationName: "SENTRAJET PREMIUM",
  openGraph: {
    type: "website",
    locale: "fr_SN",
    siteName: "SENTRAJET PREMIUM",
    images: [{ url: "/images/hero-sentrajet.webp", width: 1280, height: 720, alt: "SENTRAJET PREMIUM" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${manrope.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
