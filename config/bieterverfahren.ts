/**
 * ALLE rechtlich relevanten Texte des Bieterverfahrens an EINER
 * Stelle, damit sie nach der anwaltlichen Prüfung zentral getauscht
 * werden können, ohne dass jemand die halbe Anwendung durchsuchen
 * muss.
 *
 * STAND: NOCH NICHT ANWALTLICH GEPRÜFT. Vor dem ersten echten
 * Verfahren prüfen lassen.
 *
 * ------------------------------------------------------------------
 * Die Leitplanke, aus der sich jeder Satz hier ableitet
 * ------------------------------------------------------------------
 *
 * Ein Grundstückskauf wird erst mit der notariellen Beurkundung
 * verbindlich (Paragraf 311b Absatz 1 BGB). Ein Gebot kann deshalb
 * NICHT rechtlich bindend gemacht werden, auch nicht durch eine
 * Formulierung im Formular. Wer den gegenteiligen Eindruck erweckt,
 * verspricht etwas, das er nicht halten kann.
 *
 * Daraus folgen drei Regeln für jeden Text in dieser Datei:
 *
 * 1. Keine Versteigerungs-Sprache. Die Wörter "Versteigerung",
 *    "Auktion", "Zuschlag", "Höchstbietender" und "Mindestgebot"
 *    kommen nicht vor. Sie stammen aus einem Verfahren mit
 *    Zuschlagspflicht, die es hier nicht gibt.
 * 2. Der Verkäufer entscheidet frei, auch gegen das höchste Gebot.
 *    Das wird nicht versteckt, sondern gesagt.
 * 3. Gebote lassen sich jederzeit zurückziehen, solange die Frist
 *    läuft.
 *
 * Der wirksame Schutz gegen Fantasiegebote ist nicht juristisch,
 * sondern praktisch: vollständige Identität plus Zahlungsnachweis.
 * Ohne Nachweis kein gültiges Gebot.
 */

/** Was der Bieter vor dem Absenden bestätigen muss */
export const PFLICHT_BESTAETIGUNGEN = [
  {
    id: "regeln",
    text: "Ich habe die Regeln dieses Verfahrens gelesen und bin damit einverstanden.",
  },
  {
    id: "keine_bindung",
    text: "Mir ist bekannt, dass mein Gebot noch keinen Kaufvertrag begründet. Verbindlich wird der Kauf erst mit der notariellen Beurkundung. Bis dahin kann ich mein Gebot jederzeit zurückziehen.",
  },
  {
    id: "datenschutz",
    text: "Ich bin damit einverstanden, dass meine Angaben und mein Nachweis zur Prüfung meines Gebots an den Eigentümer weitergegeben und für diesen Verkauf verarbeitet werden.",
  },
] as const;

export type PflichtBestaetigungId = (typeof PFLICHT_BESTAETIGUNGEN)[number]["id"];

/**
 * Der Hinweis, der auf der Gebotsseite gut sichtbar über dem Formular
 * steht. Der wichtigste Text des ganzen Verfahrens.
 */
export const HINWEIS_KEINE_BINDUNG =
  "Ihr Gebot ist eine ernst gemeinte Erklärung, aber noch kein Kaufvertrag. Verbindlich wird ein Immobilienkauf in Deutschland erst mit der notariellen Beurkundung. Bis dahin können Sie Ihr Gebot jederzeit zurückziehen, und der Eigentümer entscheidet frei, mit wem er zum Notar geht.";

/** Was der Verkäufer in seiner Ansicht dauerhaft vor Augen hat */
export const HINWEIS_FREIE_ENTSCHEIDUNG =
  "Sie entscheiden frei, welches Gebot Sie annehmen. Sie sind an das höchste Gebot nicht gebunden und müssen überhaupt keines annehmen. Verbindlich wird der Verkauf erst mit dem notariellen Kaufvertrag.";

/** Warum ohne Nachweis kein Gebot möglich ist, für den Bieter erklärt */
export const HINWEIS_NACHWEIS_PFLICHT =
  "Für ein gültiges Gebot brauchen wir einen Nachweis, dass die Finanzierung steht: eine Finanzierungsbestätigung Ihrer Bank oder einen SCHUFA-BonitätsCheck. Das ist keine Bewertung Ihrer Person. Es sorgt dafür, dass Sie nicht gegen unrealistische Mitbewerber antreten.";

/** Dass niemand die Gebote der anderen sieht, offen gesagt */
export const HINWEIS_KEINE_EINSICHT =
  "Sie sehen die Gebote der anderen Interessenten nicht, und die anderen sehen Ihres nicht. Auch nicht, wie viele Gebote es gibt.";

/**
 * Vorformulierte Regeln, die der Verkäufer übernehmen oder anpassen
 * kann. Bewusst in einfacher Sprache und ohne jede Zusage, die wir
 * nicht halten können.
 */
export const REGELN_VORLAGE = `So läuft es ab:

Sie geben bis zum Ende der Frist ein Gebot ab. Sie können Ihr Gebot jederzeit erhöhen oder zurückziehen, solange die Frist läuft.

Für ein gültiges Gebot brauchen wir einen Nachweis, dass die Finanzierung steht: eine Finanzierungsbestätigung Ihrer Bank oder einen SCHUFA-BonitätsCheck.

Sie sehen die Gebote der anderen nicht. Es gibt keine Anzeige, wer gerade vorn liegt.

Nach Ablauf der Frist sehe ich mir alle Gebote an und melde mich bei Ihnen. Ich entscheide frei und bin an das höchste Gebot nicht gebunden.

Ein Gebot ist noch kein Kaufvertrag. Verbindlich wird der Kauf erst beim Notar. Bis dahin sind beide Seiten frei.`;

/**
 * Was der Verkäufer beim Einrichten liest. Kein Verkaufstext, sondern
 * das, was er wirklich wissen muss, um keinen Fehler zu machen.
 */
export const EINRICHTUNG_HINWEISE = [
  {
    titel: "Der Startpreis liegt bewusst unter Ihrer Erwartung",
    text: "Ein attraktiver Startpreis bringt mehr Interessenten in Bewegung, und aus Bewegung entsteht der Preis. Als Anhaltspunkt: etwa zehn bis fünfzehn Prozent unter dem, was Sie am Ende erwarten. Zu hoch angesetzt passiert oft gar nichts.",
  },
  {
    titel: "Zwei bis vier Wochen sind eine übliche Frist",
    text: "Kürzer wirkt gehetzt und viele Interessenten bekommen ihre Finanzierungsbestätigung nicht rechtzeitig. Länger verliert an Spannung. Sie können die Frist später verlängern, das Startdatum aber nicht zurückdrehen.",
  },
  {
    titel: "Der Startpreis steht danach fest",
    text: "Sobald das Verfahren läuft, lässt sich der Startpreis nicht mehr ändern. Alles andere wäre gegenüber denen unfair, die schon geboten haben. Die Frist dürfen Sie verlängern, alle Bieter werden dann informiert.",
  },
] as const;

/**
 * Wie ein laufendes Verfahren im Inserat erscheint. Ein Satz, der in
 * die Objektbeschreibung wandert (Exposé und Portal-Export).
 */
export function portalHinweis(fristIso: string): string {
  const frist = new Date(fristIso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `Für dieses Objekt läuft ein Bieterverfahren. Interessenten können bis zum ${frist} ein Gebot abgeben. Der angegebene Preis ist der Startpreis. Der Eigentümer entscheidet frei über die Annahme eines Gebots und ist an das höchste Gebot nicht gebunden. Verbindlich wird der Kauf erst mit der notariellen Beurkundung.`;
}

/**
 * Löschfrist der Bieterdaten nach Abschluss des Verfahrens, in Tagen.
 *
 * 90 Tage. Begründung: Nach dem Zuschlag an einen Bieter braucht der
 * Verkäufer eine Rückfallebene, falls die Finanzierung des Ersten
 * doch platzt oder der Notartermin scheitert. Diese Spanne deckt den
 * üblichen Weg bis zur Beurkundung ab. Danach sind die Daten der
 * nicht berücksichtigten Bieter für den Zweck nicht mehr erforderlich
 * (Art. 5 Abs. 1 lit. e DSGVO). Derselbe Wert wie bei den
 * Bonitätsnachweisen, damit es nur eine Frist zu merken gibt.
 * Löschen von Hand ist jederzeit möglich.
 */
export const GEBOTE_LOESCHFRIST_TAGE = 90;

/** Grenzen für die Eingaben, damit nichts Unsinniges durchgeht */
export const GEBOT_MIN_EURO = 1000;
export const GEBOT_MAX_EURO = 50_000_000;
export const FRIST_MIN_TAGE = 3;
export const FRIST_MAX_TAGE = 120;

/** Finanzierungsart des Bieters, sachlich und ohne Wertung */
export const FINANZIERUNGSARTEN = [
  { id: "eigenkapital", label: "Vollständig aus Eigenkapital" },
  { id: "finanzierung", label: "Mit Finanzierung durch eine Bank" },
  { id: "gemischt", label: "Eigenkapital und Finanzierung" },
] as const;

export type FinanzierungsArt = (typeof FINANZIERUNGSARTEN)[number]["id"];
