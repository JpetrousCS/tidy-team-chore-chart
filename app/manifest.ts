import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Petrous Family Tidy Team",
    short_name: "Tidy Team",
    description: "The Petrous Family chore chart, rewards, and weekly schedule.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#6957d5",
    orientation: "any",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
