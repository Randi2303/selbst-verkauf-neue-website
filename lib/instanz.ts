/**
 * Die Rolle dieser Instanz, seit die Software als zwei
 * Hostinger-Anwendungen laeuft (Unterdomain-Runde, 24.08.2026):
 *
 *   "oeffentlich"  selbst-verkauf.de, die oeffentliche Seite
 *   "app"          app.selbst-verkauf.de, der Anmeldebereich
 *   null           keine (lesbare) Rolle gesetzt, z. B. lokal
 *
 * Quelle ist AUSSCHLIESSLICH die Variable INSTANZ_ROLLE aus den
 * Hostinger-App-Einstellungen. Der Host-Kopf der Anfrage wird nie
 * gelesen (Befund in lib/basis-adresse.ts: hinter dem Proxy steht dort
 * die interne Adresse). Die Weiche in proxy.ts liest zur Laufzeit,
 * robots.ts und sitemap.ts lesen zur Bauzeit; beide Apps bauen bei
 * Hostinger mit ihren eigenen Variablen, deshalb stimmt beides.
 */
export type InstanzRolle = "oeffentlich" | "app" | null;

export function instanzRolle(): InstanzRolle {
  const roh = (process.env.INSTANZ_ROLLE ?? "").trim().toLowerCase();
  return roh === "oeffentlich" || roh === "app" ? roh : null;
}
