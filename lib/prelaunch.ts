/**
 * Zentraler Vorlaunch-Schalter.
 *
 * Solange die Umgebungsvariable SITE_PRELAUNCH auf "true" steht, wird die
 * Website nicht von Suchmaschinen indexiert: alle Seiten liefern
 * noindex, nofollow (Root-Layout), robots.txt sperrt alle Crawler ohne
 * Sitemap-Verweis und die Sitemap ist leer.
 *
 * Zum Launch in den Hostinger-App-Einstellungen SITE_PRELAUNCH auf
 * "false" stellen und neu deployen, dann gilt automatisch wieder das
 * normale Verhalten (index/follow, robots.txt und Sitemap wie gehabt).
 * Die Variable wird zur Build-Zeit gelesen, Code-Änderungen sind für
 * den Launch nicht nötig.
 */
export const istVorlaunch = process.env.SITE_PRELAUNCH === "true";
