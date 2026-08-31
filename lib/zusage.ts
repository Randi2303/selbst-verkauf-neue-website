/**
 * DIE EINE ZUSAGE, aus der jeder Satz und jede Frist entsteht.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DIESE DATEI GIBT
 * ---------------------------------------------------------------------
 * Befund vom 15.08.2026: Dasselbe Anliegen bekam drei verschiedene
 * Antworten. Der Rückruf sagte gar nichts darüber, wann sich jemand
 * meldet. Das Videogespräch sagte „meist noch am selben Werktag". Der
 * schriftliche Weg sagte an drei Stellen drei verschiedene Dinge,
 * darunter „so schnell wie möglich".
 *
 * „So schnell wie möglich" ist keine Zusage, sondern eine Ausrede: Sie
 * lässt sich nicht brechen, weil sie nichts behauptet, und genau
 * deshalb beruhigt sie niemanden.
 *
 * ---------------------------------------------------------------------
 * WARUM ALS KONSTANTE UND NICHT ALS SATZ IN DEN SEITEN
 * ---------------------------------------------------------------------
 * Das ist die vierte Regel der Generalprobe, und dieser Satz ist genau
 * der Fall, für den sie gemacht wurde: Eine Zahl in einem Kundentext
 * gehört nicht ausgeschrieben, sondern kommt aus derselben Quelle wie
 * die Regel, die sie beschreibt. Am 12.08.2026 blieb der Hero-Haken
 * „Monatlich kündbar" stehen, weil er keine Zahl enthielt und an keiner
 * Quelle hing, während alle Stellen mit `PAKET_MINDESTLAUFZEIT_MONATE`
 * mitwanderten.
 *
 * Hier hängt beides an denselben Zahlen: der Satz, den der Kunde liest,
 * UND die Frist, nach der das Erinnerungsverfahren anschlägt
 * (lib/wartet.ts). Wenn wir die Zusage einmal ändern, kann keine Stelle
 * zurückbleiben, weil es keine zweite Stelle gibt.
 *
 * ---------------------------------------------------------------------
 * WAS BEWUSST NICHT DRIN IST
 * ---------------------------------------------------------------------
 * FEIERTAGE. Werktag heißt hier Montag bis Freitag. Ein Feiertags-
 * Kalender wäre je Bundesland verschieden, müsste gepflegt werden und
 * würde bei fehlender Pflege still falsch rechnen. Die Folge des
 * Weglassens ist überschaubar: An einem Feiertag sagen wir eine Antwort
 * zu, die einen Tag später kommt. Die Folge einer ungepflegten Liste
 * wäre, dass wir es gar nicht mehr merken.
 */

import { formatMenge } from "@/lib/utils";

/**
 * Bis zu dieser Stunde gilt die Bitte als „heute eingegangen".
 * Später am Tag ist der Werktag zu weit fortgeschritten, um noch
 * zuverlässig zurückzurufen.
 */
export const ZUSAGE_ANNAHMESCHLUSS_STUNDE = 16;

/**
 * Wann der zugesagte Werktag als abgelaufen gilt. Erst danach ist die
 * Zusage gebrochen, und erst dann eskaliert das Erinnerungsverfahren.
 */
export const ZUSAGE_TAGESENDE_STUNDE = 18;

/**
 * Nach so vielen Stunden ohne Reaktion bekommt der zuständige Makler
 * eine Erinnerung. Deutlich VOR dem Ablauf der Zusage, denn eine
 * Erinnerung, die erst mit dem Bruch kommt, kommt zu spät, um ihn noch
 * zu verhindern.
 */
export const ZUSAGE_ERINNERUNG_STUNDEN = 4;

const WOCHENTAGE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

export function istWerktag(zeitpunkt: Date): boolean {
  const tag = zeitpunkt.getDay();
  return tag >= 1 && tag <= 5;
}

/**
 * Bis wann wir geantwortet haben müssen, wenn die Bitte zu diesem
 * Zeitpunkt eingegangen ist.
 *
 * Bis zum Annahmeschluss an einem Werktag: noch am selben Werktag.
 * Später am Tag oder am Wochenende: am nächsten Werktag.
 */
export function zusageFaelligAm(eingang: Date): Date {
  const ziel = new Date(eingang);
  const nochHeute =
    istWerktag(eingang) && eingang.getHours() < ZUSAGE_ANNAHMESCHLUSS_STUNDE;
  if (!nochHeute) {
    // Auf den nächsten Werktag schieben, notfalls über das Wochenende
    do {
      ziel.setDate(ziel.getDate() + 1);
    } while (!istWerktag(ziel));
  }
  ziel.setHours(ZUSAGE_TAGESENDE_STUNDE, 0, 0, 0);
  return ziel;
}

/** Ist die Zusage zu diesem Vorgang bereits gebrochen? */
export function zusageAbgelaufen(eingang: Date, jetzt = new Date()): boolean {
  return jetzt > zusageFaelligAm(eingang);
}

/**
 * Der Satz, den der Kunde VOR dem Absenden liest. Ein Wortlaut für
 * Rückruf, Videogespräch und schriftliche Anfrage.
 */
export function zusageSatz(): string {
  return `Wir antworten noch am selben Werktag, wenn Ihre Bitte bis ${formatMenge(ZUSAGE_ANNAHMESCHLUSS_STUNDE, "Uhr")} bei uns ist. Später am Tag oder am Wochenende melden wir uns am nächsten Werktag.`;
}

/** Dieselbe Zusage in kurz, für Fußzeilen und enge Stellen. */
export function zusageKurz(): string {
  return `Antwort noch am selben Werktag, wenn Ihre Bitte bis ${formatMenge(ZUSAGE_ANNAHMESCHLUSS_STUNDE, "Uhr")} da ist`;
}

/**
 * Der Satz, den der Kunde NACH dem Absenden liest, mit dem konkreten
 * Tag statt der Regel. Dieselbe Rückmeldung an allen drei Wegen; die
 * Ungleichheit war selbst ein Befund.
 */
export function zusageAntwort(eingang: Date, jetzt = new Date()): string {
  const faellig = zusageFaelligAm(eingang);
  if (faellig.toDateString() === jetzt.toDateString()) {
    return "Wir melden uns noch heute.";
  }
  const morgen = new Date(jetzt);
  morgen.setDate(morgen.getDate() + 1);
  if (faellig.toDateString() === morgen.toDateString()) {
    return "Wir melden uns morgen.";
  }
  return `Wir melden uns am ${WOCHENTAGE[faellig.getDay()]}.`;
}
