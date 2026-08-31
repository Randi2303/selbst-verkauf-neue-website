/**
 * Der rote Faden: die aktuelle Verkaufsphase wird aus den vorhandenen
 * Daten abgeleitet, nicht von Hand gepflegt.
 *
 * Regeln, bewusst einfach und nachlesbar:
 *
 * 1 Erfassung   erledigt, sobald der Erfassungs-Assistent abgeschlossen
 *               wurde (erfassung_schritt größer als die Schrittzahl,
 *               also die Zusammenfassung bestätigt ist).
 * 2 Bewertung   erledigt, sobald eine fertige Bewertung vorliegt UND
 *               eine Preisstrategie gewählt UND ein Angebotspreis
 *               gesetzt ist.
 * 3 Vermarktung erledigt, sobald das Inserat online ist. Das lässt sich
 *               heute noch nicht aus Daten ableiten (kommt mit der
 *               Portal-Anbindung), deshalb zählt hier die phase-Spalte
 *               am Objekt, die das Team setzen kann.
 * 4 Verkauf     wie 3, über die phase-Spalte.
 * 5 Übergabe    wie 3, über die phase-Spalte.
 *
 * Ergebnis: aktuelle Phase = Maximum aus der automatisch erkannten
 * Phase und der phase-Spalte. So kann das Team nie hinter die Daten
 * zurückfallen und die Automatik nie hinter das Team.
 */
import { type Bewertung, neuesteBewertung } from "@/lib/bewertung";
import { type Objekt } from "@/lib/objekt-felder";

/* Seit Runde 13 acht Schritte (Preis und Texte getrennt); Migration
   0091 hob abgeschlossene Objekte von erfassung_schritt 8 auf 9. */
export const ERFASSUNG_SCHRITTE = 8;

/** Zusammenfassung bestätigt, Assistent abgeschlossen */
export function erfassungAbgeschlossen(objekt: Objekt): boolean {
  return objekt.erfassung_schritt > ERFASSUNG_SCHRITTE;
}

/** Bewertungs-Phase abgeschlossen (fertige Bewertung, Strategie, Preis) */
export function bewertungAbgeschlossen(
  objekt: Objekt,
  bewertungen: Bewertung[]
): boolean {
  const fertig = neuesteBewertung(bewertungen)?.status === "fertig";
  return fertig && Boolean(objekt.preisstrategie) && Boolean(objekt.angebotspreis);
}

/** Aus den Daten abgeleitete aktuelle Phase (1 bis 5) */
export function aktuellePhase(
  objekt: Objekt,
  bewertungen: Bewertung[]
): number {
  let automatisch = 1;
  if (erfassungAbgeschlossen(objekt)) automatisch = 2;
  if (automatisch === 2 && bewertungAbgeschlossen(objekt, bewertungen)) {
    automatisch = 3;
  }
  return Math.min(5, Math.max(automatisch, objekt.phase ?? 1));
}

export type PhasenZustand = "erledigt" | "aktiv" | "offen";

/** Zustand jeder Phase für die Phasen-Leiste */
export function phasenZustaende(
  objekt: Objekt,
  bewertungen: Bewertung[]
): PhasenZustand[] {
  const aktiv = aktuellePhase(objekt, bewertungen);
  return [1, 2, 3, 4, 5].map((nr) =>
    nr < aktiv ? "erledigt" : nr === aktiv ? "aktiv" : "offen"
  );
}
