import type { MetadataRoute } from "next";
import { DEFAULT_SITE_ORIGIN, getSiteOrigin } from "@/lib/siteUrl";

export default function manifest(): MetadataRoute.Manifest {
  const origin = getSiteOrigin() || DEFAULT_SITE_ORIGIN;

  return {
    name: "Waks — Jobs in East Africa",
    short_name: "Waks",
    description:
      "Find and apply to jobs across East Africa on Waks.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#4CAF7D",
    icons: [
      {
        src: "/waks-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    id: origin,
  };
}
