/**
 * Zahlen fuer den ehrlichen Vergleich auf der Startseite.
 *
 * REGELN (10.08.2026, ausdruecklich entschieden):
 *  - KEINE fremden Preise als Tatsache. Nur Spannen mit "ueblicherweise",
 *    denn fremde Preise aendern sich, und wir koennen sie nicht
 *    garantieren. Jede Zahl hier traegt deshalb das Stand-Datum.
 *  - KEIN Wettbewerber wird genannt, nirgends, auch hier nicht. Es
 *    geht um den WEG "Inserat selbst buchen", nicht um eine Marke.
 *  - Verglichen wird gleiche Dauer gegen gleiche Dauer: Unsere Pakete
 *    enthalten SCHALTUNG_MONATE Sichtbarkeit, also zaehlt dort der
 *    Preis fuer denselben Zeitraum, nicht der Einstiegspreis fuer
 *    dreissig Tage.
 *
 * PFLEGE: Spannen pruefen und STAND aktualisieren, wenn sich der Markt
 * bewegt. Die Quellen der Erst-Erhebung liegen beim Auftraggeber
 * (eigene Recherche, ergaenzt am 10.08.2026).
 */

/* RELATIV wie in lib/laufzeit.ts: Konfigurationsdateien koennen beim
   Bauen ausserhalb des Bundlers ausgewertet werden, ohne Alias. */
import { ohneUmbruch } from "../lib/utils";

/** Wann die Spannen zuletzt geprueft wurden, erscheint auf der Seite.
 *  ohneUmbruch haelt das Datum auf einer Zeile; gemessen war "Stand
 *  10. August 2026" auf der Startseite nach "10." getrennt. */
export const VERGLEICH_STAND = ohneUmbruch("10. August 2026");

export type KostenSpanne = {
  /** Was es ist, als Leistung, nie als Marke */
  label: string;
  /** Untere und obere Grenze in Euro, brutto */
  von: number;
  bis: number;
};

/**
 * Was ein Verkauf ueber den Inserats-Weg ueblicherweise kostet, wenn
 * man die Dinge dazu nimmt, die einen Verkauf wirklich ausmachen.
 * Bewusst NUR Posten, die bei uns im Paket "Selbst & Sicher" enthalten
 * sind; was auf beiden Wegen extra kostet (Fotos, Grundrisse,
 * Energieausweis), bleibt aus der Summe draussen und wird ehrlich als
 * "auf beiden Wegen zusaetzlich" genannt.
 */
export const INSERATSWEG_KOSTEN: readonly KostenSpanne[] = [
  {
    label: "Inserat auf mehreren Portalen, sechs Monate",
    von: 500,
    bis: 1200,
  },
  {
    label: "Markteinschätzung mit echten Marktdaten",
    von: 30,
    bis: 200,
  },
];

/** Summe der Spannen, fuer die Gegenueberstellung */
export function inseratswegSumme(): { von: number; bis: number } {
  return INSERATSWEG_KOSTEN.reduce(
    (summe, posten) => ({ von: summe.von + posten.von, bis: summe.bis + posten.bis }),
    { von: 0, bis: 0 }
  );
}

/**
 * Beispielwerte des Makler-Vergleichs. Verkaufspreis wie im
 * Ersparnis-Rechner (calculator.start), der Provisionssatz kommt aus
 * siteConfig.commission; gerechnet wird live, hier steht nichts
 * doppelt.
 */
export const MAKLER_VERGLEICH_HINWEIS =
  "Verkäuferanteil der Maklerprovision, üblich sind je nach Region bis zu 3,57 % des Kaufpreises.";

/**
 * DER DRITTE WEG: Makler mit reiner Erfolgsprovision.
 *
 * Der Satz ist der DERZEITIGE Preis eines verbreiteten Anbieters
 * dieses Wegs, am 12.08.2026 direkt auf dessen Preisseite nachgelesen:
 * inklusive Mehrwertsteuer, ohne Käuferprovision, fällig nur bei
 * erfolgreichem Verkauf; vorher zahlt der Eigentümer nichts. Unterlagen
 * samt Energieausweis werden dort beschafft und vorfinanziert, die
 * Kommunikation mit Interessenten wird übernommen, und es wird ein
 * Maklervertrag geschlossen (Provisionsanspruch).
 *
 * PFLEGE: Satz und STAND gemeinsam prüfen und aktualisieren; die Seite
 * kennzeichnet die Zahl überall als heutigen Stand, nie als Naturgesetz.
 * Der Anbieter bleibt namenlos, es geht um den WEG, nicht um eine Marke.
 */
export const ERFOLGSPROVISION = {
  /** Anteil vom Kaufpreis, brutto */
  satz: 0.0099,
  satzLabel: ohneUmbruch("0,99 %"),
  /** Wann der Satz zuletzt nachgeprüft wurde, erscheint auf der Seite */
  stand: ohneUmbruch("12. August 2026"),
} as const;

/**
 * Untergrenze des Reglers im Kostenvergleich. Bewusst niedrig:
 * Unter rund 71.000 Euro
 * Verkaufspreis ist die Erfolgsprovision günstiger als unser Paket,
 * und genau dieser Punkt soll erreichbar sein. Die Darstellung bleibt
 * dann ehrlich und sagt es dazu, statt den Bereich auszublenden.
 */
export const RECHNER_MIN = 50_000;
