/**
 * WIE AUS EINEM PORTRÄT EIN AUSSCHNITT WIRD, an EINER Stelle gerechnet.
 *
 * =====================================================================
 * DAS PROBLEM (Befund des Inhabers, 26.08.2026)
 * =====================================================================
 * Die Reihe der kleinen Kreise unter der Menschen-Karte wirkte unruhig:
 * Die Köpfe saßen unterschiedlich hoch und waren unterschiedlich nah
 * herangeholt. Die Ursache liegt nicht an der Reihe, sondern an den
 * Vorlagen. Die sechs Porträts haben verschiedene Seitenverhältnisse
 * (2:3 bis rund 7:8), und die Menschen stehen darin verschieden weit
 * weg: Der Kopf füllt zwischen 24 und 47 Prozent der Bildhöhe.
 *
 * `object-position` allein kann das nicht heilen. Es VERSCHIEBT den
 * Ausschnitt, es ZOOMT nicht. Für gleiche Augenhöhe reicht Verschieben,
 * für gleiche Kopfgröße nicht.
 *
 * =====================================================================
 * DIE LÖSUNG: EIN BILDMITTELPUNKT JE PERSON, ZWEI REGELN DARAUS
 * =====================================================================
 * In config/menschen.ts steht je Person, WO das Gesicht im Bild liegt
 * (Typ `Bildmittelpunkt`). Aus diesen drei gemessenen Zahlen rechnet
 * diese Datei beide Ausschnitte:
 *
 *   kopfAusschnitt()   für RUNDE (quadratische) Flächen: Augen auf
 *                      gleicher Höhe UND Kopf gleich groß. Dafür wird
 *                      das Bild zusätzlich herangeholt, deshalb liefert
 *                      die Funktion einen ganzen Kasten und keine
 *                      object-position.
 *   portraetFokus()    für Flächen, die den ganzen Abzug zeigen
 *                      (3:4-Karte, liegende Makler-Karte): NUR
 *                      verschieben, nie zoomen. Ein Fotoabzug soll ein
 *                      Mensch bleiben und kein Passbild werden.
 *
 * KEINE ZWEITE LISTE, KEINE SONDERFÄLLE IM BAUSTEIN: Wer eine Person
 * anders ausgeschnitten haben will, ändert ihre drei Zahlen in
 * config/menschen.ts. Wer die ganze Reihe anders haben will, ändert die
 * beiden Konstanten hier.
 *
 * DIE BILDDATEIEN BLEIBEN UNANGETASTET. Es wird nur anders
 * ausgeschnitten; erzeugt wird nichts.
 */

/**
 * Wo das Gesicht im Bild liegt. Alle drei Werte sind PROZENT der
 * jeweiligen Bildkante, abgelesen am Bild selbst (Vorgehen: Bild mit
 * Prozentraster überlegen und ablesen, siehe Rundenbericht 34).
 */
export type Bildmittelpunkt = {
  /** Waagerechte Mitte des Kopfes, in Prozent der BILDBREITE */
  x: number;
  /** Höhe der Augenlinie, in Prozent der BILDHÖHE, von oben */
  augen: number;
  /** Kopfhöhe von Scheitel bis Kinn, in Prozent der BILDHÖHE */
  kopf: number;
};

/** Die echten Maße der Datei, zur Bauzeit gelesen (lib/menschen-bilder.ts) */
export type Bildmasse = { breite: number; hoehe: number };

/* ------------------------------------------------------------------ */
/* Die beiden Stellschrauben der runden Ausschnitte                    */
/* ------------------------------------------------------------------ */

/**
 * Wie viel Höhe der Kopf im Kreis einnimmt, als Anteil des
 * Durchmessers.
 *
 * WARUM 0,70 UND NICHT WENIGER: Das Bild von René Breuer ist am engsten
 * aufgenommen; sein Kopf ist 47 Prozent der Bildhöhe hoch, das sind bei
 * 2:3 rund 70 Prozent der Bildbreite. Ein Kreis kann nie mehr Bild
 * zeigen als die Breite hergibt, ohne Lücken an den Seiten. Jeder Wert
 * unter 0,705 wäre für ihn also nicht einzuhalten, und er allein müsste
 * größer bleiben als die anderen. Gemessen und beide Fassungen
 * angesehen (Runde 34).
 */
export const KREIS_KOPF_ANTEIL = 0.7;

/** Wo die Augenlinie im Kreis sitzt, als Anteil der Höhe von oben */
export const KREIS_AUGEN_HOEHE = 0.42;

/** Wo die Augenlinie in einem Abzug sitzt, der das ganze Bild zeigt */
export const ABZUG_AUGEN_HOEHE = 0.4;

/**
 * Zwei Seitenverhältnisse gelten als gleich, wenn sie weniger als das
 * auseinanderliegen. Grund: Drei der sechs Porträts sind rechnerisch
 * 0,7503 statt 0,75. Ohne diese Schwelle wären sie formal "breiter als
 * der Rahmen", und die Rechnung teilte durch beinahe null.
 */
const GLEICH_GENUG = 0.005;

const zwischen = (wert: number, klein: number, gross: number) =>
  Math.min(gross, Math.max(klein, wert));

/**
 * Der Bildkasten für eine QUADRATISCHE Fläche, in Prozent dieser
 * Fläche. Wird als absolut gesetzter Kasten in die runde Fläche
 * gelegt; das Bild darin füllt ihn ohne eigenen Beschnitt, weil der
 * Kasten dasselbe Seitenverhältnis hat wie das Bild.
 *
 * Ergebnis: Bei allen Personen liegt die Augenlinie auf
 * KREIS_AUGEN_HOEHE und der Kopf ist KREIS_KOPF_ANTEIL hoch.
 *
 * ZWEI SICHERUNGEN, damit nie ein Loch entsteht:
 *  - Ist der gewünschte Kasten kleiner als die Fläche, wird er so weit
 *    vergrößert, dass er sie gerade deckt. Der Kopf ist dann größer als
 *    gewollt; das ist immer noch besser als eine Lücke.
 *  - Der Kasten wird nie so verschoben, dass eine Kante hereinragt.
 */
export function kopfAusschnitt(
  mittelpunkt: Bildmittelpunkt,
  masse: Bildmasse
): { breite: number; hoehe: number; links: number; oben: number } {
  const verhaeltnis = masse.breite / masse.hoehe;
  const kopf = mittelpunkt.kopf / 100;
  const x = mittelpunkt.x / 100;
  const augen = mittelpunkt.augen / 100;

  let breite = (KREIS_KOPF_ANTEIL * verhaeltnis) / kopf;
  let hoehe = KREIS_KOPF_ANTEIL / kopf;

  const deckung = Math.max(1, 1 / breite, 1 / hoehe);
  breite *= deckung;
  hoehe *= deckung;

  const links = zwischen(0.5 - x * breite, 1 - breite, 0);
  const oben = zwischen(KREIS_AUGEN_HOEHE - augen * hoehe, 1 - hoehe, 0);

  return {
    breite: breite * 100,
    hoehe: hoehe * 100,
    links: links * 100,
    oben: oben * 100,
  };
}

/**
 * Die object-position für eine Fläche, die den ganzen Abzug zeigt.
 * Verschiebt nur, zoomt nie.
 *
 * @param rahmen Seitenverhältnis der Fläche als Breite durch Höhe
 *               (3:4 also 0.75, quadratisch 1).
 *
 * WAS DIESE FUNKTION NICHT KANN, und das ist keine Schwäche der
 * Rechnung, sondern der Vorlagen: Ist das Bild BREITER als der Rahmen
 * oder genauso breit, gibt es senkrecht nichts zu verschieben. Die
 * Augen landen dann dort, wo sie im Bild liegen. Bei drei der sechs
 * Porträts (genau 3:4) und bei Kevin Gutfreund (7:8, also breiter) ist
 * das der Fall; ihre senkrechte Angabe war schon vorher wirkungslos,
 * nur stand sie da, als täte sie etwas.
 */
export function portraetFokus(
  mittelpunkt: Bildmittelpunkt,
  masse: Bildmasse,
  rahmen: number
): string {
  const verhaeltnis = masse.breite / masse.hoehe;

  /* Bild schmaler als der Rahmen: senkrechtes Spiel, waagerecht keins */
  if (verhaeltnis < rahmen - GLEICH_GENUG) {
    const spiel = rahmen / verhaeltnis;
    const anteil = ((mittelpunkt.augen / 100) * spiel - ABZUG_AUGEN_HOEHE) / (spiel - 1);
    return `50% ${Math.round(zwischen(anteil, 0, 1) * 100)}%`;
  }

  /* Bild breiter als der Rahmen: waagerechtes Spiel, senkrecht keins */
  if (verhaeltnis > rahmen + GLEICH_GENUG) {
    const spiel = verhaeltnis / rahmen;
    const anteil = ((mittelpunkt.x / 100) * spiel - 0.5) / (spiel - 1);
    return `${Math.round(zwischen(anteil, 0, 1) * 100)}% 50%`;
  }

  /* Gleich: nichts zu verschieben */
  return "50% 50%";
}

/**
 * Wo die Augen bei diesem Rahmen wirklich landen, als Anteil der
 * Rahmenhöhe. Nur für Messung und Bericht; die Seite ruft das nicht
 * auf. Sie macht sichtbar, wo die Rechnung an die Grenze der Vorlage
 * stößt, statt es zu verschweigen.
 */
export function augenImRahmen(
  mittelpunkt: Bildmittelpunkt,
  masse: Bildmasse,
  rahmen: number
): number {
  const verhaeltnis = masse.breite / masse.hoehe;
  const augen = mittelpunkt.augen / 100;
  if (verhaeltnis >= rahmen - GLEICH_GENUG) return augen;
  const spiel = rahmen / verhaeltnis;
  const fokus = portraetFokus(mittelpunkt, masse, rahmen);
  const anteil = Number(fokus.split(" ")[1].replace("%", "")) / 100;
  return augen * spiel - anteil * (spiel - 1);
}
