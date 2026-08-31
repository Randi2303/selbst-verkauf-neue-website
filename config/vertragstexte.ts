import {
  PAKET_MINDESTLAUFZEIT_MONATE,
  SCHALTUNG_MONATE,
  SCHALTUNG_START_FRIST_MONATE,
} from "@/lib/laufzeit";
import { zahlwort, zahlwortGross } from "@/lib/utils";

/**
 * Die Texte rund um Laufzeit, Kuendigung und Widerruf im
 * Bestellvorgang und im Konto.
 *
 * RECHTLICHER RAHMEN, WICHTIG: Alle mit "TODO Anwalt" markierten Texte
 * sind VORLAEUFIGE Arbeitsfassungen. Sie halten den Platz und den
 * Sinn, die endgueltige Formulierung kommt aus der anwaltlichen
 * Pruefung (wie REGELN_VORLAGE in config/bieterverfahren.ts und der
 * VERANTWORTLICHKEITS_HINWEIS in lib/expose.ts). Der Code haengt nur
 * an den Konstanten-Namen, ein neuer Wortlaut ist eine reine
 * Textaenderung an dieser einen Stelle.
 *
 * Die ZAHLEN in den Texten kommen aus lib/laufzeit.ts, damit eine
 * geaenderte Dauer nie einen veralteten Satz zuruecklaesst.
 */

/**
 * Mindestlaufzeit des monatlichen Paketmodells, ehrlich begruendet.
 * Erscheint im Konfigurator, an der Kasse und im Konto, nicht im
 * Kleingedruckten.
 */
/* ZWEI AENDERUNGEN VOM 21.08.2026, beide aus der Lese-Liste:

   1. "Ihr Paket hat" steht davor, weil der Satz vorher mit einer
      Ziffer begann. Im Assistenten ist er ein Satz und keine
      Ueberschrift, und kein deutscher Satz beginnt mit einer Ziffer.
   2. Das ZAHLWORT statt der Ziffer. Es stand hier zunaechst eine
      Ziffer, WEIL DAS WERKZEUG es verlangte: Die Nachpruefung hielt
      jede Zahl einer Antwort gegen diesen Text, und "drei" haette
      jede Antwort mit der Ziffer verworfen. Seit die Pruefung Zahlen
      als Zahlen liest (lib/wissenspruefung.ts,
      zahlwoerterAlsZiffern), gibt es diesen Grund nicht mehr.
      "Nicht der Text soll sich der Pruefung beugen."

   DIE ZAHL KOMMT WEITER AUS lib/laufzeit.ts, nur als Wort: Eine
   geaenderte Dauer laesst nie einen veralteten Satz zurueck, und ab
   dreizehn schreibt zahlwort() von selbst wieder die Ziffer. */
export const MINDESTLAUFZEIT_HINWEIS = `Ihr Paket hat ${zahlwort(PAKET_MINDESTLAUFZEIT_MONATE)} Monate Mindestlaufzeit, weil wir Ihre Immobilie im ersten Monat vollständig aufbereiten: Erfassung, Markteinschätzung und Exposé. Danach läuft das Paket unbefristet und ist zum Ende jedes Monats kündbar, ohne automatische Verlängerung um feste Zeiträume.`;

/** Die monatliche Makler-Begleitung, Beginn und Ende */
export const MAKLER_BEGLEITUNG_HINWEIS =
  "Die Makler-Begleitung beginnt erst, wenn Ihnen Ihr persönlicher Ansprechpartner zugewiesen ist, nicht mit der Buchung. Sie hat keine Mindestlaufzeit und ist zum Ende jedes Monats kündbar. Angefangene Monate werden zu Ende geführt und nicht anteilig erstattet. Markieren Sie Ihren Verkauf im Konto als abgeschlossen, endet die Begleitung von selbst zum Monatsende, ohne Kündigung.";

/**
 * Die Portalschaltung beim EINMALKAUF: Beginn erst mit der
 * Veroeffentlichung, und dann befristet.
 *
 * NUR BEIM EINMALKAUF. Beide Haelften dieses Satzes sind fuer einen
 * monatlichen Kunden falsch, und zwar in verschiedene Richtungen:
 * Seine Schaltung endet nicht nach sechs Monaten, solange er zahlt,
 * UND fuer die Vorbereitungszeit zahlt er sehr wohl, naemlich seine
 * Monatsrate ab Buchung. Fuer ihn gilt SCHALTUNG_MONATLICH_HINWEIS.
 */
export const SCHALTUNG_HINWEIS = `Die ${zahlwort(SCHALTUNG_MONATE)} Monate Portalschaltung beginnen an dem Tag, an dem Ihr Inserat tatsächlich online geht, nicht mit der Bestellung. Für die Vorbereitungszeit zahlen Sie nichts. Veröffentlichen Sie innerhalb von ${zahlwort(SCHALTUNG_START_FRIST_MONATE)} Monaten nach dem Kauf. Danach endet Ihr Anspruch auf die enthaltene Portalschaltung, und Sie buchen sie zum dann gültigen Preis neu. Alles andere aus Ihrer Bestellung bleibt Ihnen erhalten.`;

/**
 * Dieselbe Aussage fuer das MONATLICHE Paket, als Gegenstueck zum
 * Einmalkauf-Satz. Entschieden am 30.08.2026 vom Inhaber:
 *
 *   "Ein monatlicher Kunde zahlt weiter und darf sein Inserat nicht
 *    verlieren."
 *
 * DER BEFUND DAZU: Bis heute ging der Sechs-Monats-Satz an alle, ohne
 * nach der Zahlweise zu fragen. Ein monatlicher Kunde von "Selbst &
 * Sicher" las in seiner Bestellbestaetigung, seine Schaltung laufe
 * sechs Monate, waehrend er weiter 169 Euro im Monat zahlte. Beim
 * Anfragenmanagement war die Trennung seit dem 13.08.2026 gebaut, bei
 * der Schaltung fehlte sie; dieser Satz ist die fehlende Haelfte.
 */
export const SCHALTUNG_MONATLICH_HINWEIS =
  "Die Portalschaltung läuft, solange Ihr Paket läuft. Sie beginnt an dem Tag, an dem Ihr Inserat online geht, und endet erst mit Ihrer Kündigung.";

/**
 * KI-Anfragenmanagement beim EINMALKAUF eines Pakets. Entschieden am
 * 10.08.2026: enthalten fuer die Dauer der Portalschaltung, ab
 * Veroeffentlichung. So laeuft alles, was laeuft, gleich lang, und der
 * Einmalpreis hat einen klar bezifferten Umfang. Beim MONATLICHEN
 * Paket gilt der Satz nicht, dort laeuft es einfach mit, solange das
 * Paket laeuft.
 */
export const ANFRAGEN_EINMALKAUF_HINWEIS = `Die KI-Antwortvorschläge sind beim Einmalkauf für ${zahlwort(SCHALTUNG_MONATE)} Monate ab Veröffentlichung Ihres Inserats enthalten, genauso lange wie die Portalschaltung. Danach können Sie sie bei Bedarf monatlich weiterbuchen.`;

/**
 * Dieselbe Aussage fuer das MONATLICHE Paket, als Gegenstueck zum
 * Einmalkauf-Satz: Ohne sie wirkte der Wechsel auf monatlich so, als
 * fiele das Anfragenmanagement weg (Befund vom 13.08.2026).
 */
export const ANFRAGEN_MONATLICH_HINWEIS =
  "Die KI-Antwortvorschläge sind enthalten, solange Ihr Paket läuft.";

/**
 * Was beim Ende einer Leistung bleibt. Steht VOR jeder Kuendigung.
 *
 * ---------------------------------------------------------------------
 * "DER GESAMTE VERLAUF" IST AM 30.08.2026 HERAUSGEFALLEN (Runde 44)
 * ---------------------------------------------------------------------
 * Der Satz versprach, auch der gesamte Verlauf bleibe UNBEFRISTET
 * erhalten. Das war eine Zusage, die das Haus nicht haelt. Gemessen
 * gegen lib/loeschfristen.ts und die drei Loeschlaeufe:
 *
 *   Interessenten-Akten (Anfragen, Nachrichten, Notizen,
 *   Besichtigungs-Verlauf, Nachweise, Gebote)
 *                                6 Monate NACH DER VERKAUFSMELDUNG,
 *                                sonst 12 Monate ohne Kontakt
 *   Meldungen in der Glocke      180 Tage
 *   Erfassungs-Gespraech         90 Tage
 *   Assistenten-Absagen          90 Tage
 *
 * WAS WIRKLICH UNBEFRISTET BLEIBT, und dafuer steht der Satz
 * weiterhin gerade: profiles, objekte, bewertungen und unterlagen
 * werden von KEINEM Loeschlauf angefasst. Nachgemessen am 30.08.2026;
 * die beiden Stellen, an denen `objekte` in den Loeschlaeufen
 * vorkommt, sind Lesezugriffe.
 *
 * Der Inhaber dazu: "Der gesamte Verlauf war eine Zusage, die wir
 * nicht halten."
 *
 * DIE FRIST AUF DIE INTERESSENTEN-AKTEN steht seither dort, wo sie
 * ausgeloest wird: im Verkaufs-Dialog (components/konto/VerkaufMelden),
 * mit dem Hinweis, vorher herunterzuladen.
 */
export const KUENDIGUNG_BLEIBT_HINWEIS =
  "Ihr Konto, Ihre Objektdaten, die Markteinschätzung, das Exposé und alle Unterlagen bleiben unbefristet erhalten. Nur das Inserat auf den Portalen geht offline, und die laufende Betreuung endet.";

/**
 * Dieselben Laufzeit-Aussagen als KURZE tragende Zeile plus
 * aufklappbare Einzelheiten, NUR fuer die Kasse: Dort standen fuenf
 * volle Absaetze untereinander, und die Seite las sich wie ein
 * Vertragswerk. Die kurze Zeile traegt die Aussage auch zugeklappt;
 * die Einzelheiten ergaenzen sie, ersetzen sie aber nicht. Mail und
 * Konto verwenden weiterhin die vollen Saetze oben, dort gibt es
 * kein Aufklappen.
 *
 * WICHTIG fuers Pflegen: kurz und lang muessen zusammen denselben
 * Inhalt tragen wie der volle Satz oben. Wer oben etwas aendert,
 * zieht es hier nach.
 */
export const LAUFZEIT_KURZFASSUNGEN: Record<
  string,
  { kurz: string; details: string }
> = {
  [MINDESTLAUFZEIT_HINWEIS]: {
    kurz: `Ihr Paket hat ${zahlwort(PAKET_MINDESTLAUFZEIT_MONATE)} Monate Mindestlaufzeit, danach ist es zum Ende jedes Monats kündbar.`,
    details:
      "Im ersten Monat bereiten wir Ihre Immobilie vollständig auf: Erfassung, Markteinschätzung und Exposé. Danach läuft das Paket unbefristet, ohne automatische Verlängerung um feste Zeiträume.",
  },
  [MAKLER_BEGLEITUNG_HINWEIS]: {
    kurz: "Die Makler-Begleitung beginnt erst mit der Zuweisung Ihres Ansprechpartners und ist monatlich kündbar.",
    details:
      "Sie hat keine Mindestlaufzeit. Angefangene Monate werden zu Ende geführt und nicht anteilig erstattet. Markieren Sie Ihren Verkauf im Konto als abgeschlossen, endet die Begleitung von selbst zum Monatsende, ohne Kündigung.",
  },
  [SCHALTUNG_HINWEIS]: {
    kurz: `Die ${zahlwort(SCHALTUNG_MONATE)} Monate Portalschaltung beginnen erst, wenn Ihr Inserat online geht.`,
    details: `Für die Vorbereitungszeit zahlen Sie nichts. Veröffentlichen Sie innerhalb von ${zahlwort(SCHALTUNG_START_FRIST_MONATE)} Monaten nach dem Kauf. Danach endet Ihr Anspruch auf die enthaltene Portalschaltung, und Sie buchen sie zum dann gültigen Preis neu. Alles andere aus Ihrer Bestellung bleibt Ihnen erhalten.`,
  },
  [SCHALTUNG_MONATLICH_HINWEIS]: {
    kurz: "Die Portalschaltung läuft, solange Ihr Paket läuft.",
    details:
      "Sie beginnt an dem Tag, an dem Ihr Inserat online geht, und endet erst mit Ihrer Kündigung.",
  },
  [ANFRAGEN_EINMALKAUF_HINWEIS]: {
    kurz: `KI-Antwortvorschläge sind für ${zahlwort(SCHALTUNG_MONATE)} Monate ab Veröffentlichung enthalten.`,
    details:
      "Das ist dieselbe Dauer wie die Portalschaltung. Danach können Sie sie bei Bedarf monatlich weiterbuchen.",
  },
  [KUENDIGUNG_BLEIBT_HINWEIS]: {
    kurz: "Nach einer Kündigung bleiben Ihr Konto, Ihre Daten und Ihre Unterlagen unbefristet erhalten.",
    details:
      "Das gilt für Ihre Objektdaten, die Markteinschätzung, das Exposé und alle Unterlagen. Nur das Inserat auf den Portalen geht offline, und die laufende Betreuung endet. Ihre Interessenten-Akten löschen wir dagegen sechs Monate nach einer Verkaufsmeldung; das steht dort, wo Sie den Verkauf melden.",
  },
};

/**
 * Zustimmung zum sofortigen Beginn der Arbeit, mit dem Hinweis auf das
 * Erloeschen des Widerrufsrechts (§ 356 Abs. 4 BGB sinngemaess).
 *
 * TODO Anwalt: VORLAEUFIGE Arbeitsfassung. Endgueltiger Wortlaut,
 * Belehrung und Muster-Widerrufsformular kommen aus der anwaltlichen
 * Pruefung. Bis dahin haelt dieser Text die Stelle im Bestellvorgang
 * besetzt, damit die Zustimmung strukturell nie fehlt.
 */
export const WIDERRUF_ZUSTIMMUNG_TEXT =
  "Ich verlange ausdrücklich, dass Sie sofort mit der Ausführung der gebuchten Leistungen beginnen. Mir ist bekannt, dass ich mein Widerrufsrecht verliere, sobald die Leistung vollständig erbracht ist.";

/** Kurzer Hinweis unter der Zustimmung, wohin sich Verbraucher wenden */
export const WIDERRUF_KURZHINWEIS =
  "Verbrauchern steht bei online geschlossenen Verträgen ein vierzehntägiges Widerrufsrecht zu. Einzelheiten enthält die Widerrufsbelehrung in der Auftragsbestätigung.";

/* ------------------------------------------------------------------ */
/* Die oeffentliche Kuendigungs-Stelle /kuendigen                      */
/*                                                                     */
/* Gesetzlicher Rahmen (§ 312k BGB sinngemaess): Der Weg muss ohne     */
/* Anmeldung erreichbar sein, staendig verfuegbar und unmittelbar      */
/* auffindbar, mit Bestaetigungsschaltflaeche und einer               */
/* Empfangsbestaetigung in Textform samt Datum und Uhrzeit.           */
/*                                                                     */
/* TODO Anwalt: Saemtliche Formulierungen unten sind Arbeitsfassungen. */
/* Der Anwalt prueft die Woerter, nicht ob es die Stelle gibt.        */
/* ------------------------------------------------------------------ */

/** Beschriftung des Zugangs, z. B. im Fuss der Website */
export const KUENDIGUNG_LINK_TEXT = "Verträge hier kündigen";

export const KUENDIGUNG_SEITE_TITEL = "Laufenden Vertrag kündigen";

export const KUENDIGUNG_SEITE_EINLEITUNG =
  "Hier kündigen Sie eine laufende Leistung, ohne Anmeldung und ohne Begründung. Damit wir Ihre Kündigung dem richtigen Vertrag zuordnen können, brauchen wir die Angaben unten. Was gekündigt wird, endet zum Ende des laufenden Monats; Ihr Konto, Ihre Objektdaten, das Exposé und alle Unterlagen bleiben in jedem Fall erhalten.";

/** Beschriftung der Bestaetigungsschaltflaeche, gesetzlich gefordert eindeutig */
export const KUENDIGUNG_KNOPF_TEXT = "Jetzt kündigen";

export const KUENDIGUNG_BESTAETIGUNG_TITEL = "Ihre Kündigung ist eingegangen.";

export const KUENDIGUNG_BESTAETIGUNG_TEXT =
  "Wir haben Ihre Kündigungserklärung erhalten und bestätigen Ihnen den Eingang zusätzlich per E-Mail, mit Datum und Uhrzeit. Wir ordnen sie Ihrem Vertrag zu und melden uns, sobald das Ende eingetragen ist. Ihr Konto und alle Daten bleiben erhalten.";

/* ------------------------------------------------------------------ */
/* Runde 19: welche dieser Texte der Assistent ausgeben darf           */
/* ------------------------------------------------------------------ */

/**
 * DIE AUSKUENFTE ZU LAUFZEIT UND KUENDIGUNG, die der Assistent geben
 * darf, mit Titel und Ziel.
 *
 * DIE NEUE GRENZE (Entscheidung des Inhabers, 21.08.2026): Was
 * zwischen uns und dem Kunden gilt, ist eine Auskunft ueber unser
 * eigenes Angebot und erlaubt. Was zwischen dem Kunden und einem
 * Dritten oder dem Gesetz gilt, bleibt gesperrt. "Wie lange laeuft
 * mein Paket" ist keine Rechtsberatung, das steht hier drueber.
 *
 * JEDER DIESER TEXTE WIRD WOERTLICH AUSGELIEFERT, nie umformuliert
 * (`woertlich` in lib/wissensquelle.ts). Das Modell darf nur noch
 * auswaehlen, welcher passt. Der Grund: Bei Laufzeit und Kuendigung
 * haengt an jedem Halbsatz Geld, und eine Paraphrase ist genau die
 * Stelle, an der aus "zum Ende jedes Monats kuendbar" ein
 * "monatlich kuendbar, meist zum Monatsende" wird.
 *
 * WAS HIER BEWUSST FEHLT:
 *
 * WIDERRUF_ZUSTIMMUNG_TEXT und WIDERRUF_KURZHINWEIS. Beide tragen
 * "TODO Anwalt" und sind Arbeitsfassungen. Zum Widerrufsrecht
 * antwortet der Assistent mit der festen Absage und verweist auf die
 * Widerrufsbelehrung in der Auftragsbestaetigung.
 *
 * LAUFZEIT_KURZFASSUNGEN. Das ist dieselbe Aussage in kuerzerer Form
 * fuer die Kasse. Zweimal dieselbe Auskunft in der Wissensgrundlage
 * hiesse, dass die Erkennung zwischen zwei richtigen Eintraegen
 * waehlen muss, und der kuerzere traegt weniger.
 */
export const VERTRAGS_AUSKUENFTE: {
  schluessel: string;
  titel: string;
  text: string;
  ziel?: string;
}[] = [
  {
    schluessel: "mindestlaufzeit",
    titel: "Mindestlaufzeit und Kündigung der monatlichen Pakete",
    text: MINDESTLAUFZEIT_HINWEIS,
    ziel: "/konto/leistungen",
  },
  {
    schluessel: "makler-begleitung",
    titel: "Makler-Begleitung: Beginn, Laufzeit und Kündigung",
    text: MAKLER_BEGLEITUNG_HINWEIS,
    ziel: "/konto/leistungen",
  },
  {
    schluessel: "portalschaltung",
    titel: "Ab wann die Monate der Portalschaltung laufen",
    text: SCHALTUNG_HINWEIS,
    ziel: "/konto/leistungen",
  },
  {
    schluessel: "anfragen-einmalkauf",
    titel: "Wie lange die KI-Antwortvorschläge beim Einmalkauf laufen",
    text: ANFRAGEN_EINMALKAUF_HINWEIS,
    ziel: "/konto/leistungen",
  },
  {
    schluessel: "anfragen-monatlich",
    titel: "Wie lange die KI-Antwortvorschläge im monatlichen Paket laufen",
    text: ANFRAGEN_MONATLICH_HINWEIS,
    ziel: "/konto/leistungen",
  },
  {
    schluessel: "kuendigung-bleibt",
    titel: "Was nach einer Kündigung erhalten bleibt",
    text: KUENDIGUNG_BLEIBT_HINWEIS,
    ziel: "/konto/leistungen",
  },
];

/* WARUM KUENDIGUNG_SEITE_EINLEITUNG HIER NICHT STEHT (Befund des
   Inhabers, 21.08.2026): Der Text beginnt mit "Hier kuendigen Sie
   eine laufende Leistung, ohne Anmeldung" und nennt "die Angaben
   unten". Beides zeigt auf die oeffentliche Kuendigungsseite, auf der
   er steht. Im Assistenten sitzt der Kunde angemeldet in seinem
   Konto, und "hier" zeigt dort auf nichts.

   DER WEG ZUM KUENDIGEN IST EIN ABLAUF und kein Vertragstext; er
   steht seit dem 21.08.2026 in config/ablaeufe.ts, gegen die
   Oberflaeche geprueft, und nennt beide Wege.

   scripts/saetze-pruefen.mts prueft alle Eintraege hier auf solche
   ortsgebundenen Verweise und bricht den Bau, wenn einer
   hineinrutscht. */
