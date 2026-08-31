/**
 * WAS WIR ÜBER DIE SCHUTZ-ADRESSE SAGEN DÜRFEN, heute und später.
 *
 * ---------------------------------------------------------------------
 * WOHER DIESE DATEI KOMMT (Befund des Inhabers, 23.08.2026)
 * ---------------------------------------------------------------------
 * "Ihre private E-Mail-Adresse bekommt niemand zu sehen" stand an
 * mehreren Stellen im Konto als Tatsache. Die Schutz-Adresse braucht
 * dafür den bezahlten Versand-Tarif und ein Postfach, das an ihr
 * lauscht. Beides steht aus. Zum Start soll es da sein, heute ist es
 * das nicht.
 *
 * ---------------------------------------------------------------------
 * WARUM AN DIE BEDINGUNG GEHÄNGT UND NICHT EINFACH GESTRICHEN
 * ---------------------------------------------------------------------
 * Ein gestrichener Satz muss jemand von Hand wieder hinschreiben,
 * genau in dem Moment, in dem alle mit dem Einschalten beschäftigt
 * sind. Ein Satz an der Bedingung erscheint von selbst, sobald
 * ANFRAGEN_INBOUND auf "an" steht, und zwar an allen vier Stellen
 * gleichzeitig.
 *
 * ---------------------------------------------------------------------
 * BEIDE HÄLFTEN SIND LEBENDIG, und das wird geprüft
 * ---------------------------------------------------------------------
 * Eine Formel, deren eine Hälfte nie erreicht wird, ist dieselbe
 * Bauart wie ein Muster, das nie treffen kann (Befund vom 21.08.2026).
 * Deshalb steht hier je Stelle ein PAAR, und scripts/saetze-pruefen.mts
 * prüft beide Fassungen mit denselben sechs Regeln wie jeden anderen
 * festen Text. Keine Fassung kann still verfallen.
 *
 * Der Schalter selbst ist `anfragenEmpfangSteht()` in lib/mail.ts. Er
 * wird NICHT hier gelesen: Diese Datei enthält Text und sonst nichts,
 * damit sie auch im Browser und im Prüfwerkzeug benutzbar bleibt.
 */

export type SchutzTextPaar = {
  /** Wenn der Empfang über die Schutz-Adresse steht */
  steht: string;
  /** Solange er nicht steht. Sagt, was heute wahr ist, und sonst nichts. */
  stehtNicht: string;
};

export const ANFRAGEN_SCHUTZ_TEXTE = {
  /** Unterzeile der Karte "Anfragen" auf der Übersicht */
  kartenUnterzeile: {
    steht: "Gebündelt aus allen Portalen, Ihre private E-Mail bleibt unsichtbar.",
    stehtNicht: "Gebündelt aus Ihrer Objektseite und aus den Portalen.",
  },
  /** Zweiter Satz im Führungs-Schritt zu den Anfragen */
  fuehrungAnfragen: {
    steht: "Sie antworten an dieser Stelle, und Ihre private E-Mail-Adresse bekommt niemand zu sehen.",
    stehtNicht: "Sie lesen und beantworten alles an dieser Stelle.",
  },
  /** Erklärkarte zur geschützten Objekt-Adresse im Bereich Anfragen */
  schutzAdresse: {
    steht: "Diese Adresse steht in Ihrem Inserat. Ihre private E-Mail bleibt unsichtbar.",
    stehtNicht:
      "Diese Adresse steht in Ihrem Inserat. Der Empfang darüber ist noch nicht eingerichtet. Anfragen erreichen Sie zurzeit über Ihre Objektseite und über die Portale.",
  },
  /** Dieselbe Karte, solange das Objekt noch keine Adresse hat */
  schutzAdresseKommt: {
    steht: "Sie entsteht mit Ihrem Objekt und steht dann in Ihrem Inserat. Ihre private E-Mail bleibt unsichtbar.",
    stehtNicht:
      "Sie entsteht mit Ihrem Objekt und steht dann in Ihrem Inserat. Der Empfang darüber ist noch nicht eingerichtet.",
  },
  /** Hinweiszeile in der Mail über eine neue Anfrage */
  mailHinweis: {
    steht: "Antworten schreiben Sie direkt im Konto. Ihre private E-Mail-Adresse bekommt der Interessent dabei nie zu sehen.",
    stehtNicht: "Antworten schreiben Sie direkt im Konto.",
  },
} as const satisfies Record<string, SchutzTextPaar>;

export type SchutzTextSchluessel = keyof typeof ANFRAGEN_SCHUTZ_TEXTE;

/** Der Satz, der heute wahr ist */
export function schutzText(
  schluessel: SchutzTextSchluessel,
  empfangSteht: boolean
): string {
  const paar = ANFRAGEN_SCHUTZ_TEXTE[schluessel];
  return empfangSteht ? paar.steht : paar.stehtNicht;
}
