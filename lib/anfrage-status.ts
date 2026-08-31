/**
 * Der Stand einer Unterhaltung, also einer PERSON.
 *
 * Seit Migration 0056 steht er an der Akte (interessenten.status) und
 * nicht mehr an der einzelnen Anfrage. Der Grund ist derselbe wie beim
 * Umbau des Posteingangs: Fragt jemand über zwei Portale, ist das ein
 * Gespräch und nicht zwei, und zwei Stände für einen Menschen wären
 * zwei Wahrheiten.
 *
 * WOZU ÜBERHAUPT: Einen Zahlungsnachweis von jemandem zu verlangen,
 * der nur fragt, wann eine Besichtigung möglich wäre, ist
 * unverhältnismäßig und schreckt Interessenten ab. Der Stand
 * entscheidet deshalb, ab wann die Bitte um einen Nachweis überhaupt
 * angeboten wird. Nebenbei sortiert er die Liste.
 *
 * ER PFLEGT SICH WEITGEHEND SELBST (Trigger in 0056), und das ist
 * Absicht: Eine Liste, die sich selbst pflegt, ist immer wahr; eine,
 * die gepflegt werden muss, verwaist.
 *
 *   zugestellte Antwort .... "In Kontakt"
 *   Einladung verschickt ... "Besichtigung geplant"
 *
 * Beides nur VORWÄRTS, und beides niemals über "Kein Interesse"
 * hinweg: Das hat ein Mensch entschieden, und keine Automatik
 * SCHIEBT darüber hinweg.
 *
 * SEIT MIGRATION 0114 GIBT ES ZWEI RÜCKWEGE, beide keine freien
 * Rückwärts-Schritte, sondern Neuberechnungen aus Tatsachen an genau
 * benannten Ereignissen (Festlegung des Inhabers, 25.08.2026):
 *
 *   Einladung fällt weg .... zurück auf "In Kontakt", wenn keine
 *                            lebendige Einladung mehr da ist. Vorher
 *                            stand "Besichtigung geplant" nach einer
 *                            Absage für immer da.
 *   neue Anfrage ........... hebt "Kein Interesse" auf "Neu" auf.
 *                            Eine Absage gilt einem Vorgang und
 *                            nicht einem Menschen; die alte
 *                            Entscheidung bleibt im Verlauf lesbar.
 *
 * Von Hand darf der Verkäufer weiterhin alles setzen, auch zurück.
 * Im Alltag braucht er "Kein Interesse", und "In Kontakt", wenn er
 * sich außerhalb gekümmert hat, etwa am Telefon: Ein Anruf erzeugt
 * kein Ereignis im System, und ohne den Vermerk mahnt das
 * Aufgaben-Band eine längst beantwortete Anfrage weiter an.
 */

export type AnfrageStatus =
  | "neu"
  | "in_kontakt"
  | "besichtigung_geplant"
  | "kein_interesse";

export const ANFRAGE_STATUS: {
  id: AnfrageStatus;
  label: string;
  /** Kurz erklärt, wann dieser Status passt */
  hinweis: string;
}[] = [
  { id: "neu", label: "Neu", hinweis: "Noch nicht bearbeitet." },
  { id: "in_kontakt", label: "In Kontakt", hinweis: "Sie schreiben oder telefonieren gerade." },
  {
    id: "besichtigung_geplant",
    label: "Besichtigung geplant",
    hinweis: "Ein Termin steht oder ist verabredet.",
  },
  { id: "kein_interesse", label: "Kein Interesse", hinweis: "Hat sich erledigt." },
];

export const ANFRAGE_STATUS_LABEL: Record<AnfrageStatus, string> = Object.fromEntries(
  ANFRAGE_STATUS.map((s) => [s.id, s.label])
) as Record<AnfrageStatus, string>;

/**
 * Ab wann ein Nachweis angefragt werden darf.
 *
 * Im Regelfall erst bei "Besichtigung geplant". Vorher gibt es den
 * Knopf gar nicht, er ist nicht bloß ausgegraut: Ein Knopf, den man
 * sieht und nicht drücken kann, wirft nur die Frage auf, warum nicht.
 *
 * ZWEI AUSNAHMEN, beide bewusst hier und nicht verstreut in der
 * Oberfläche:
 *
 * BEIM BIETERVERFAHREN ist der Nachweis Voraussetzung für jedes
 * Gebot, unabhängig davon, wie weit das Gespräch gediehen ist.
 *
 * BEI EINGESCHALTETER NACHWEIS-PFLICHT (Wahl am Objekt, Migration
 * 0038) kommt ohne Nachweis kein Besichtigungstermin zustande. Dann
 * muss die Bitte FRÜH möglich sein, sonst erführe der Interessent die
 * Bedingung erst, wenn er einen Termin will.
 */
export function darfNachweisAnfordern(
  status: AnfrageStatus,
  imBieterverfahren = false,
  nachweisPflicht = false
): boolean {
  return (
    imBieterverfahren || nachweisPflicht || status === "besichtigung_geplant"
  );
}

/** Wann so eine Bitte üblich ist, als Erklärzeile am Knopf */
export const NACHWEIS_ZEITPUNKT_HINWEIS =
  "Üblich ist das vor einer Besichtigung oder vor einem Gebot, nicht schon bei der ersten Kontaktaufnahme.";

/** Die Erklärzeile bei eingeschalteter Nachweis-Pflicht am Objekt */
export const NACHWEIS_PFLICHT_HINWEIS =
  "Für Ihr Objekt gilt: Besichtigung erst nach Nachweis. Bitten Sie früh darum, damit kein Termin daran hängen bleibt.";
