/**
 * Die Provisions-Aussage, an EINER Stelle festgelegt.
 *
 * Portal-Export, Exposé und Objektansicht lesen ausschließlich hier.
 * So kann die Aussage nicht auseinanderlaufen: Ein Inserat, das im
 * Exposé "provisionsfrei" verspricht und im Portal etwas anderes
 * überträgt, wäre gegenüber Kaufinteressenten eine Falschangabe.
 *
 * Unser Modell:
 *   Der KÄUFER zahlt bei uns nie eine Maklerprovision. Das ist der
 *   Kern des Angebots und ändert sich auch im Sonderfall nicht.
 *   Der VERKÄUFER zahlt normalerweise ebenfalls keine Provision,
 *   sondern einen Festpreis. Nur wenn er die Makler-Begleitung mit
 *   echter Vermittlung bucht, vereinbart er mit dem Makler-Partner
 *   eine Innenprovision (objekte.innen_courtage, nur vom Team
 *   setzbar).
 *
 * Zuordnung im OpenImmo-Standard (geprüft am 06.08.2026 gegen
 * openimmo_127d.xsd):
 *   preise > aussen_courtage   Textfeld, Attribut mit_mwst (boolean).
 *                              Laut XSD "Courtage, die der Kunde zu
 *                              zahlen hat", also die Käufer-Seite.
 *   preise > innen_courtage    Textfeld, Attribut mit_mwst. Laut XSD
 *                              "Maklercourtage bei Vermittlungs- bzw.
 *                              Nachweisgeschäften", also die
 *                              Verkäufer-Seite.
 *   preise > provisionspflichtig  xsd:boolean.
 *   preise > courtage_hinweis     xsd:string.
 */
import type { Objekt } from "@/lib/objekt-felder";

export type Provisionsangabe = {
  /**
   * Muss der KÄUFER eine Provision zahlen? Steuert
   * preise > provisionspflichtig und damit den Portal-Suchfilter
   * "provisionsfrei". Bei uns immer false.
   */
  kaeuferZahlt: boolean;
  /** Inhalt von preise > aussen_courtage */
  aussenCourtage: string;
  /** Inhalt von preise > innen_courtage, null wenn keine vereinbart */
  innenCourtage: string | null;
  /** Inhalt von preise > courtage_hinweis, erklärt die Lage in einem Satz */
  hinweis: string;
  /** Kurzfassung für Exposé und Objektansicht */
  kurz: string;
  /** Liegt der Sonderfall vor? Für Kennzeichnungen im Admin */
  sonderfall: boolean;
};

/**
 * Die Provisions-Aussage zu einem Objekt.
 *
 * Zur Auslegung von provisionspflichtig: Das Schema sagt dazu nur
 * "Zusätzlich Boolean, weil courtage auch als String genutzt wird".
 * Die Portale nutzen den Wert für den Filter "provisionsfrei", und
 * dieser Filter meint aus Sicht der Suchenden immer die KÄUFER-Seite.
 * Deshalb entscheidet hier die Käufer-Courtage, nicht die
 * Innenprovision des Verkäufers. Die vollständige Lage steht
 * zusätzlich im courtage_hinweis, damit niemand in die Irre geht.
 * Offener Punkt, mit den Portalen zu bestätigen (siehe
 * docs/openimmo-abgleich.md).
 */
export function provisionsAngabe(
  objekt: Pick<Objekt, "innen_courtage">
): Provisionsangabe {
  const innen = objekt.innen_courtage?.trim() || null;
  if (!innen) {
    return {
      kaeuferZahlt: false,
      aussenCourtage: "provisionsfrei",
      innenCourtage: null,
      hinweis:
        "Für Käufer fällt keine Maklerprovision an. Der Verkauf läuft über selbst-verkauf.de zum Festpreis.",
      kurz: "Provisionsfrei für Käufer",
      sonderfall: false,
    };
  }
  return {
    kaeuferZahlt: false,
    aussenCourtage: "provisionsfrei",
    innenCourtage: innen,
    hinweis: `Für Käufer fällt keine Maklerprovision an. Der Verkäufer hat mit dem betreuenden Makler eine Innenprovision von ${innen} vereinbart.`,
    kurz: "Für Käufer provisionsfrei, Vermittlung durch unseren Makler-Partner",
    sonderfall: true,
  };
}
