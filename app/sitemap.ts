import type { MetadataRoute } from "next";
import { instanzRolle } from "@/lib/instanz";
import { istVorlaunch } from "@/lib/prelaunch";
import { siteConfig } from "@/site.config";

/** Alle öffentlichen Seiten, die Platzhalter-Routen sind bewusst nicht gelistet */
export default function sitemap(): MetadataRoute.Sitemap {
  // Vorlaunch-Schutz: leere Sitemap, solange SITE_PRELAUNCH true ist.
  // Ebenso leer auf der App-Instanz: Deren Seiten gehoeren nie in
  // einen Suchindex, die Liste hier nennt ohnehin nur die Hauptdomain.
  if (istVorlaunch || instanzRolle() === "app") return [];
  const lastModified = new Date();
  return [
    {
      url: `${siteConfig.domain}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.domain}/leistungen`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.domain}/wunsch-paket`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.domain}/team`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteConfig.domain}/lexikon`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteConfig.domain}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
