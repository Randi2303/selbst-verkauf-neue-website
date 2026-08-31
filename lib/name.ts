/**
 * Der Name in zwei Teilen: eine Stelle, an der zusammengesetzt und
 * getrennt wird.
 *
 * WARUM UEBERHAUPT GETRENNT: Ein einziges Feld "Name" liefert "Anna
 * Meier", "Meier, Anna" und "Dr. A. Meier-Schulz". Daraus laesst sich
 * hinterher weder eine Anrede bauen noch eine Rechnung adressieren,
 * und Stripe erwartet zur Rechnungsanschrift einen sauberen Namen.
 *
 * WO ES LIEGT: in profiles.vorname und profiles.nachname. profiles.name
 * ist seit Migration 0035 eine ABGELEITETE Spalte, sie laesst sich
 * lesen, aber nicht beschreiben. Damit kann der volle Name gar nicht
 * mehr von seinen Teilen abweichen.
 */

/** Vor- und Nachname zu einem Namen verbinden. Leere Teile fallen weg. */
export function vollerName(
  vorname: string | null | undefined,
  nachname: string | null | undefined
): string {
  return [(vorname ?? "").trim(), (nachname ?? "").trim()].filter(Boolean).join(" ");
}

/**
 * Einen einzelnen Namen in Vor- und Nachname zerlegen.
 *
 * NUR FUER VORBELEGUNGEN, nie zum stillen Speichern. Getrennt wird am
 * LETZTEN Leerzeichen: "Anna Maria Meier" wird zu "Anna Maria" und
 * "Meier". Das trifft den deutschen Normalfall und liegt bei
 * "von der Heide" daneben. Genau deshalb gehoert das Ergebnis in ein
 * Formular, wo der Mensch es sieht und in zwei Sekunden korrigiert,
 * und nicht ungefragt in die Datenbank.
 */
export function nameTrennen(name: string | null | undefined): [string, string] {
  const wert = (name ?? "").trim().replace(/\s+/g, " ");
  if (!wert) return ["", ""];
  const letzte = wert.lastIndexOf(" ");
  if (letzte < 0) return ["", wert];
  return [wert.slice(0, letzte), wert.slice(letzte + 1)];
}
