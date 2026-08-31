import "server-only";
import { siteConfig } from "@/site.config";

/**
 * Die Basis-Adresse fuer JEDEN Link, der das Haus verlaesst.
 *
 * DER BEFUND, der dazu gefuehrt hat (08.08.2026): Ein frisch angelegter
 * Kunde landete beim Klick auf "Passwort setzen" auf
 * https://0.0.0.0:3000/passwort-setzen?fehler=abgelaufen. Das ist die
 * interne Adresse, an die der Node-Server auf Hostinger gebunden ist,
 * und sie ist von keinem fremden Rechner erreichbar. Der erste Schritt
 * jedes neuen Kunden war damit tot.
 *
 * Die alte linkBasis() las den Host aus der eingehenden Anfrage
 * (x-forwarded-host, sonst request.url). Hinter dem Proxy des Hosters
 * steht dort die interne Adresse. Eine Anfrage ist grundsaetzlich der
 * falsche Ort dafuer: Sie sagt, wie jemand ZU UNS gekommen ist, nicht,
 * unter welcher Adresse wir fuer die Welt erreichbar sind. Genau das
 * gehoert in die Konfiguration.
 *
 * ES WIRD NICHT GERATEN. Ist der Wert unbrauchbar, gibt diese Funktion
 * null zurueck, und der Aufrufer bricht ab. Eine Mail mit kaputtem Link
 * ist schlimmer als keine Mail: Sie verbrennt den einen Moment, in dem
 * der Kunde bereit war, und hinterlaesst den Eindruck einer defekten
 * Seite.
 */

/* Die Pruef-Logik liegt seit der Unterdomain-Runde in
   lib/basis-pruefung.ts, weil auch lib/app-basis.ts sie braucht und
   deren Abnehmer ohne server-only laufen muessen. Der Re-Export haelt
   alle bisherigen Importe am Leben. */
export { basisPruefen, type BasisPruefung } from "@/lib/basis-pruefung";
import { basisPruefen } from "@/lib/basis-pruefung";

/**
 * Die geprüfte Basis-Adresse, oder null.
 *
 * Quelle ist site.config.ts. SITE_URL kann sie überschreiben, damit
 * eine Testumgebung eigene Links verschicken kann, ohne dass jemand
 * die Konfiguration im Repository ändert.
 */
export function basisAdresse(): string | null {
  const pruefung = basisPruefen(process.env.SITE_URL || siteConfig.domain);
  if (!pruefung.ok) {
    console.error("[basis-adresse]", pruefung.grund);
    return null;
  }
  return pruefung.basis;
}

/** Die Begruendung, wenn keine brauchbare Basis-Adresse vorliegt */
export function basisFehler(): string {
  const pruefung = basisPruefen(process.env.SITE_URL || siteConfig.domain);
  return pruefung.ok ? "" : pruefung.grund;
}
