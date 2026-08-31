/**
 * Die Woerter des Nachweis-Stands, an EINER Stelle.
 *
 * lib/bonitaet.ts ist NUR SERVER-SEITIG, aber die Woerter braucht
 * auch der Browser: das Schaufenster auf der Startseite zeigt den
 * Chip "Finanzierung bestätigt", und der darf nicht abgeschrieben
 * sein, sonst laeuft er beim naechsten Umbenennen auseinander
 * (Regel 0b der Schaufenster-Runde: dieselben Woerter).
 *
 * Deshalb liegen die vier Bezeichnungen hier als reine Daten, und
 * nachweisBezeichnung() in lib/bonitaet.ts setzt sie zusammen. Wer
 * ein Wort aendert, aendert es fuer Konto, Mails und Schaufenster
 * zugleich.
 *
 * "Bonitaet nachgewiesen" gibt es bewusst NICHT, siehe die
 * Begruendung in lib/bonitaet.ts: nachgewiesen stand da, bevor
 * jemand hineingesehen hatte.
 */
export const NACHWEIS_WORTE = {
  unbrauchbar: "Nachweis unbrauchbar",
  eingegangen: "Nachweis eingegangen",
  finanzierungBestaetigt: "Finanzierung bestätigt",
  schufaLiegtVor: "SCHUFA-Nachweis liegt vor",
} as const;
