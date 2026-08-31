/**
 * DIE EINE STELLE FUER PORTALNAMEN (Inhaber, Feinschliff 24.08.2026).
 *
 * Ein Portal hat einen Namen, und der steht hier. Jede Fläche, die
 * einen Portalnamen zeigt (Oberfläche, Mails, Exposé, interner
 * Bereich, Export-Beschriftungen), holt ihn aus dieser Datei. Die
 * Bau-Prüfung scripts/portalnamen-pruefen.mts schlägt an, wenn
 * irgendwo ein Portalname steht, der nicht von hier kommt.
 *
 * SCHREIBWEISEN SIND FREMDE MARKEN und folgen dem jeweiligen Inhaber,
 * nicht unserem Geschmack (geprüft am 24.08.2026):
 *
 * - "ImmoScout24": so schreibt die Immobilien Scout GmbH ihre Marke
 *   heute selbst (immobilienscout24.de, Impressum und Fließtexte;
 *   "ImmobilienScout24" ist die Altform).
 * - "Kleinanzeigen": seit dem 16.05.2023 ohne eBay (Kleinanzeigen
 *   GmbH, kleinanzeigen.de; Umbenennung von "eBay Kleinanzeigen").
 * - "immowelt": KLEIN geschrieben, auch mitten im Satz; so führt die
 *   Marke sich selbst (immowelt.de, Presseseiten der AVIV Germany
 *   GmbH). Die Großform "Immowelt" war unsere eigene Erfindung.
 *
 * KENNUNG UND NAME SIND ZWEIERLEI: In der Datenbank (anfragen.portal,
 * interessenten.herkunft, portal_eingaenge.portal) stehen Kennungen.
 * Die Aliasse fangen Altwerte und fremde Schreibungen ein, die dort
 * historisch liegen können (etwa "is24" aus dem Vorführ-Aufbau).
 */

export const PORTALE = [
  {
    kennung: "immoscout24",
    name: "ImmoScout24",
    aliasse: ["is24", "immobilienscout24", "immoscout"],
  },
  {
    kennung: "kleinanzeigen",
    name: "Kleinanzeigen",
    aliasse: ["ebay-kleinanzeigen", "ebay kleinanzeigen", "ebayk"],
  },
  {
    kennung: "immowelt",
    name: "immowelt",
    aliasse: [],
  },
] as const;

export type PortalKennung = (typeof PORTALE)[number]["kennung"];

export const PORTAL_KENNUNGEN = PORTALE.map((p) => p.kennung) as PortalKennung[];

/**
 * Anzeigename zu einer gespeicherten Kennung. Unbekannte Werte kommen
 * unverändert zurück: Fremde Namen und Freitexte (etwa "Telefon" aus
 * der Interessenten-Maske) schreiben sich selbst.
 */
export function portalName(wert: string | null | undefined): string | null {
  if (!wert) return null;
  const klein = wert.trim().toLowerCase();
  for (const p of PORTALE) {
    if (p.kennung === klein) return p.name;
    if ((p.aliasse as readonly string[]).includes(klein)) return p.name;
  }
  return wert;
}

/** Name je Kennung, für Sätze, die ein Portal direkt nennen */
export const PORTAL_NAME = Object.fromEntries(
  PORTALE.map((p) => [p.kennung, p.name])
) as Record<PortalKennung, string>;

/** "ImmoScout24, Kleinanzeigen und immowelt", für Fließtexte */
export const PORTALE_AUFZAEHLUNG = `${PORTALE.slice(0, -1)
  .map((p) => p.name)
  .join(", ")} und ${PORTALE[PORTALE.length - 1].name}`;

/**
 * Der Herkunfts-Halbsatz für Meldungen und Mails ("über ImmoScout24",
 * "über Ihre Objektseite"). EINE Formulierung für alle Kanäle; vorher
 * gab es sie dreimal, und zwei Fassungen zeigten die rohe Kennung.
 */
export function herkunftSatz(portal: string | null | undefined): string {
  if (portal === "objektseite") return "über Ihre Objektseite";
  if (portal === "pruefdaten") return "als Prüf-Anfrage";
  const name = portalName(portal);
  return name ? `über ${name}` : "über einen unbenannten Weg";
}
