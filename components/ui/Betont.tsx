import { Fragment } from "react";

/**
 * Rendert die EINE erlaubte Betonung in Daten-Texten: **…** wird zu
 * einem ruhig gewichteten <strong> in Textfarbe, alles andere bleibt
 * unangetastet. Gebaut für die Erfahrungs-Angaben der begleitenden
 * Makler (config/menschen.ts); die Zahl darf Gewicht haben, mehr
 * Hervorhebung will der Inhaber ausdrücklich nicht (Runde 31,
 * "sparsam"). Wer hier ein zweites Auszeichnungszeichen ergänzen
 * möchte, hat die Vorgabe gegen sich.
 */
export function mitBetonung(text: string): React.ReactNode {
  const teile = text.split("**");
  if (teile.length === 1) return text;
  return teile.map((teil, i) => (
    <Fragment key={i}>
      {i % 2 === 1 ? <strong className="font-medium text-ink">{teil}</strong> : teil}
    </Fragment>
  ));
}
