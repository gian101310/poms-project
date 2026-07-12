import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "POMS — Pet Store Operations",
    short_name: "POMS",
    description: "Pet Store operations, checklists, attendance, grooming, cashier, and command center.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#166534",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/poms-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/poms-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
