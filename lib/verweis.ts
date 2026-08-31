/**
 * EIN VERWEIS, DEN MAN AUSLIEFERN DARF.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DIESE PRUEFUNG GIBT (Runde 20, 22.08.2026)
 * ---------------------------------------------------------------------
 * `objekte.rundgang_link` und `objekte.film_link` sind beide als `frei`
 * entschieden (config/schreibrechte.ts): Es ist das Objekt des Kunden,
 * und er darf seinen eigenen Rundgang und sein eigenes Video zeigen.
 *
 * DARAUS FOLGT ABER, dass der Wert aus einer Hand kommt, der wir nichts
 * glauben duerfen. Die Adress-Pruefung der Admin-Route greift nur bei
 * unserem eigenen Weg (Fertig-Meldung des Auftrags); ueber die
 * Datenbank-Schnittstelle schreibt der Kunde direkt, und der
 * `anon`-Schluessel dafuer steckt im ausgelieferten Javascript.
 *
 * Beide Werte landen danach an drei Orten, die sie AUSFUEHREN oder
 * VERFOLGEN: als `src` eines iframes, als `href` eines Links und als
 * Ziel einer Verweis-Flaeche im Exposé-PDF. Ein `javascript:`-Wert
 * waere dort kein Schoenheitsfehler, sondern fremder Kode auf der
 * OEFFENTLICHEN Objektseite, den jeder Besucher ausfuehrt.
 *
 * ---------------------------------------------------------------------
 * DIE REGEL
 * ---------------------------------------------------------------------
 * NUR http und https, sonst null. Kein `javascript:`, kein `data:`,
 * kein `blob:`, kein `file:`. Die Liste ist eine ERLAUBNIS und keine
 * Sperrliste: Was hier nicht steht, geht nicht, und ein neues Schema
 * im Browser oeffnet damit keine neue Tuer.
 *
 * NULL HEISST: NICHT ANZEIGEN. Ein unbrauchbarer Verweis verschwindet,
 * statt als toter oder gefaehrlicher Knopf dazustehen.
 */

/**
 * Der Verweis, wenn man ihn ausliefern darf, sonst null.
 *
 * Nimmt auch null und undefined entgegen, damit die Aufrufer die
 * Spalte durchreichen koennen, ohne vorher zu pruefen.
 */
export function webVerweis(link: string | null | undefined): string | null {
  if (!link) return null;
  let adresse: URL;
  try {
    adresse = new URL(link.trim());
  } catch {
    /* wirkung: gewollt sichtbar stattdessen: Eine Zeichenkette, die
       keine Adresse ist, ist kein Fehler dieser Funktion, sondern eine
       Eingabe, die nichts zu zeigen hat. Der Rueckfall ist sichtbar:
       Objektseite und Exposé lassen den Block dann weg. */
    return null;
  }
  return adresse.protocol === "https:" || adresse.protocol === "http:"
    ? adresse.toString()
    : null;
}
