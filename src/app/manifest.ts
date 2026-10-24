import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sen Trajet — courses et covoiturage",
    short_name: "Sen Trajet",
    description: "Courses immédiates et sièges réservés au Sénégal.",
    start_url: "/app",
    display: "standalone",
    lang: "fr",
    background_color: "#0B0B0C",
    theme_color: "#0B0B0C",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  }
}
