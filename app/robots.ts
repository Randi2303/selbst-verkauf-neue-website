import type { MetadataRoute } from "next";
import { instanzRolle } from "@/lib/instanz";
import { istVorlaunch } from "@/lib/prelaunch";
import { siteConfig } from "@/site.config";

/**
 * Alle Routen sind erlaubt, auch die neuen Seiten /leistungen, /team und
 * /lexikon. Die Platzhalter-Seiten (/register, /impressum, /datenschutz)
 * tragen stattdessen ein noindex im Meta-Tag, damit Crawler den Hinweis
 * lesen können.
 */
export default function robots(): MetadataRoute.Robots {
  // Die App-Instanz (app.selbst-verkauf.de) sperrt Crawler DAUERHAFT,
  // unabhaengig vom Vorlaunch-Schalter und auch nach dem Launch: Der
  // Anmeldebereich gehoert nie in einen Suchindex. Denselben Zweck
  // erfuellt der X-Robots-Tag, den proxy.ts dort auf jede Antwort
  // setzt; robots.txt laeuft am Proxy vorbei (matcher-Ausnahme) und
  // braucht die Regel deshalb selbst.
  if (instanzRolle() === "app" || istVorlaunch) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${siteConfig.domain}/sitemap.xml`,
  };
}
