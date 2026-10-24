import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yoon — courses et covoiturage",
    short_name: "Yoon",
    description: "Courses immédiates et sièges réservés au Sénégal.",
    start_url: "/app",
    display: "standalone",
    lang: "fr",
    background_color: "#F4F1EB",
    theme_color: "#0E6E68",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  }
}
