import { basisPruefen } from "@/lib/basis-pruefung";
import { siteConfig } from "@/site.config";

/**
 * Die Basis-Adresse fuer Links in den ANGEMELDETEN Bereich.
 *
 * Seit der Unterdomain-Runde (24.08.2026) gibt es zwei Basen:
 *
 *   basisAdresse()  lib/basis-adresse.ts  SITE_URL   die oeffentliche
 *                   Seite und ALLES, was ein Dritter zu sehen bekommt
 *   appBasis()      diese Datei           APP_URL    Konto, Admin und
 *                   die Anmelde-Wege, also Links an unseren KUNDEN
 *
 * DIE REGEL DES INHABERS: Auf app.selbst-verkauf.de liegt
 * ausschliesslich der Anmeldebereich. Kein Einmal-Link, keine
 * Objektseite, kein QR-Code, kein Export nimmt jemals diese Basis.
 * Die Bau-Pruefung `npm run adressen:pruefen` setzt das durch.
 *
 * OHNE APP_URL faellt die Funktion auf die oeffentliche Basis zurueck
 * und alles verhaelt sich wie vor der Runde. Genau das macht den Code
 * gefahrlos ausrollbar, bevor die Variablen gesetzt sind, und es ist
 * zugleich der Rueckweg: Variable weg, Verhalten von frueher.
 *
 * KEIN server-only in dieser Datei, mit Grund: lib/mail-vorlagen.ts
 * ruft appBasis() auf und wird vom Erzeuger-Skript
 * scripts/mail-vorlagen-erzeugen.mjs unter purem Node geladen, wo
 * server-only beim Import wirft. In ein Client-Bundle darf sie
 * trotzdem nie geraten: Dort ist process.env leer, und jeder Link
 * fiele still auf die Konfiguration zurueck. Es gibt heute keinen
 * Client-Import (gemessen, 24.08.2026); wer einen einbaut, baut einen
 * Fehler ein.
 *
 * Die Basis kommt NIE aus der Anfrage. Warum, steht ausfuehrlich in
 * lib/basis-adresse.ts; fuer diese Datei gilt derselbe Befund.
 */
export function appBasis(): string | null {
  const app = basisPruefen(process.env.APP_URL);
  if (app.ok) return app.basis;
  if ((process.env.APP_URL ?? "").trim()) {
    /* APP_URL steht da und taugt nicht: Das ist ein Konfigurations-
       fehler und darf nicht still im Rueckfall verschwinden. */
    console.error("[app-basis]", app.grund);
  }
  const oeffentlich = basisPruefen(process.env.SITE_URL || siteConfig.domain);
  if (oeffentlich.ok) return oeffentlich.basis;
  console.error("[app-basis]", oeffentlich.grund);
  return null;
}

/** Die Begruendung, wenn keine brauchbare Basis vorliegt */
export function appBasisFehler(): string {
  const app = basisPruefen(process.env.APP_URL);
  if (app.ok) return "";
  const oeffentlich = basisPruefen(process.env.SITE_URL || siteConfig.domain);
  return oeffentlich.ok ? "" : oeffentlich.grund;
}
