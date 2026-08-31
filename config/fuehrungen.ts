import { ASSISTENT_NAME } from "@/config/wissensfragen";
import type { SchutzTextSchluessel } from "@/config/anfragen-schutz";
import { ERFASSUNG_SCHRITTE } from "@/lib/phasen-status";
import { zahlwortGross } from "@/lib/utils";

/**
 * DIE FÜHRUNGEN: was wo erklärt wird.
 *
 * =====================================================================
 * DIE STELLE, AN DER SO ETWAS STIRBT (Auflage des Inhabers, 23.08.2026)
 * =====================================================================
 * "Wenn die Schritte eine eigene Liste mit eigenen Namen und eigenen
 * Zielen tragen, zeigt der Kreis in vier Wochen auf eine Stelle, an der
 * nichts mehr ist, und niemand merkt es."
 *
 * Genau das ist der bisherigen Einführung passiert, nur an einer Zahl
 * statt an einem Kreis: Sie sagte "in sieben Schritten", während
 * ERFASSUNG_SCHRITTE seit Runde 13 auf acht steht. Monatelang, ohne
 * dass es jemandem auffiel.
 *
 * =====================================================================
 * WIE EIN SCHRITT AN DIE OBERFLÄCHE GEBUNDEN IST
 * =====================================================================
 * ZWEI TEILE, BEIDE PRÜFBAR:
 *
 *   bereich   ein href aus KONTO_BEREICHE (lib/konto-navigation.ts).
 *             Verschwindet der Bereich, bricht der Bau.
 *   ziel      ein Name aus FUEHRUNGS_ZIELE, gesetzt über den Helfer
 *             `fuehrung()` aus lib/fuehrung-ziel.ts.
 *
 * DER HELFER UND NICHT EIN BLANKES MERKMAL, weil TypeScript dann
 * mitprüft: Ein Tippfehler ist ein Übersetzungsfehler, und eine
 * Umbenennung bricht an jeder Verwendungsstelle, statt still
 * danebenzuzeigen.
 *
 * `npm run fuehrung:pruefen` hält beide Richtungen: jedes Ziel braucht
 * eine Verwendungsstelle, jede Verwendungsstelle braucht einen Eintrag.
 *
 * =====================================================================
 * WAS DIE BAU-PRÜFUNG NICHT SEHEN KANN
 * =====================================================================
 * Sie sieht nicht, ob das Element WIRKLICH GERENDERT wird (es kann
 * hinter einer Bedingung stehen), ob es SICHTBAR ist (die Bereichsleiste
 * gibt es zweimal, am Schreibtisch und am Telefon), ob es die RICHTIGE
 * Stelle ist (wer das Merkmal auf den Nachbarn schiebt, bekommt eine
 * grüne Prüfung und einen Kreis um das Falsche), und ob der TEXT noch
 * stimmt. Sie ist außerdem eine Textsuche und gilt damit als Untergrenze.
 *
 * Dagegen steht zur Laufzeit: Ein Schritt ohne sichtbares Ziel wird
 * ÜBERSPRUNGEN, und "Schritt 3 von 5" zählt nur, was wirklich kommt. Es
 * gibt nie einen Kreis um nichts.
 *
 * =====================================================================
 * ZAHLEN UND BEGRIFFE WERDEN GERECHNET, NICHT GETIPPT
 * =====================================================================
 * "Acht Schritte" kommt aus ERFASSUNG_SCHRITTE, Theos Name aus
 * ASSISTENT_NAME, und der Satz zur Schutz-Adresse aus
 * config/anfragen-schutz.ts, wo er an den Empfang gebunden ist.
 */

/* ------------------------------------------------------------------ */
/* Die Ziele: geschlossene Liste, damit TypeScript sie prüfen kann     */
/* ------------------------------------------------------------------ */

export const FUEHRUNGS_ZIELE = [
  /* Übersicht */
  "stand",
  "naechster-schritt",
  "bereiche",
  "anfragen",
  "theo",
  /* Objekt */
  "objekt-schritte",
  "objekt-hilfe",
  /* Fotos */
  "fotos-hochladen",
  "fotos-reihenfolge",
  /* Exposé */
  "expose-karte",
  /* Anfragen */
  "anfragen-liste",
  "anfragen-schutzadresse",
  /* Leistungen (Texte vom Inhaber freigegeben, 24.08.2026) */
  "leistungen-katalog",
  "leistungen-auftraege",
  "leistungen-laufend",
  "leistungen-anrechnung",
  /* Termine */
  "termine-anfragen",
  "termine-verfuegbarkeit",
  "termine-liste",
  /* Interessenten */
  "interessenten-liste",
  "interessenten-anlegen",
  /* Bieterverfahren */
  "bieter-einrichtung",
  "bieter-regeln",
  "bieter-entscheiden",
] as const;

export type FuehrungsZiel = (typeof FUEHRUNGS_ZIELE)[number];

export type FuehrungsSchritt = {
  ziel: FuehrungsZiel;
  /** Muss ein href aus KONTO_BEREICHE sein */
  bereich: string;
  titel: string;
  text: string;
  /**
   * Ein zweiter Satz, der an einer Bedingung hängt. Steht in
   * config/anfragen-schutz.ts mit beiden Fassungen, damit keine still
   * verfällt.
   */
  schutzSatz?: SchutzTextSchluessel;
};

export type FuehrungsKennung =
  | "uebersicht"
  | "objekt"
  | "fotos"
  | "expose"
  | "anfragen"
  | "leistungen"
  | "termine"
  | "interessenten"
  | "bieterverfahren";

export type Fuehrung = {
  kennung: FuehrungsKennung;
  /** Wie sie in den Einstellungen heißt */
  name: string;
  /**
   * null heißt: beim ersten Anmelden, auf der Übersicht. Sonst der
   * Pfad, bei dessen erstem Besuch sie anläuft.
   */
  pfad: string | null;
  schritte: FuehrungsSchritt[];
};

/* ------------------------------------------------------------------ */
/* Die Führungen                                                       */
/* ------------------------------------------------------------------ */

export const FUEHRUNGEN: Fuehrung[] = [
  {
    kennung: "uebersicht",
    name: "Rundgang durch Ihr Konto",
    pfad: null,
    /**
     * FÜNF SCHRITTE, und sie beantworten FRAGEN statt Orte aufzuzählen
     * (Zuschnitt vom 23.08.2026). "Wo lade ich Fotos hoch" ist am
     * ersten Tag die falsche Frage: Der Mensch hat sein Objekt noch
     * nicht erfasst. Beantwortet wird sie zum richtigen Zeitpunkt von
     * der Checkliste und von der Führung im Bereich Fotos.
     */
    schritte: [
      {
        ziel: "stand",
        bereich: "/konto",
        titel: "Hier sehen Sie, wo Ihr Verkauf steht.",
        text: "Fünf Abschnitte von der Erfassung bis zur Übergabe. Der Punkt wandert von selbst weiter, sobald Sie etwas erledigt haben.",
      },
      {
        ziel: "naechster-schritt",
        bereich: "/konto",
        titel: "Das ist Ihr nächster Schritt.",
        text: "Ganz oben steht immer die eine Sache, die jetzt dran ist. Darunter sehen Sie, was in dieser Phase noch folgt.",
      },
      {
        ziel: "bereiche",
        bereich: "/konto",
        titel: "Hier liegt alles zu Ihrem Verkauf.",
        text: "Ihr Objekt, Ihre Fotos, Ihre Unterlagen und Ihr Exposé. Sie können jederzeit hin und her springen, gespeichert wird bei jedem Schritt.",
      },
      {
        ziel: "anfragen",
        bereich: "/konto/anfragen",
        titel: "Hier landen alle Anfragen.",
        text: "Jeder, der sich für Ihre Immobilie meldet, steht hier, egal über welches Portal.",
        schutzSatz: "fuehrungAnfragen",
      },
      {
        ziel: "theo",
        bereich: "/konto",
        titel: `Wenn Sie etwas nicht verstehen, fragen Sie ${ASSISTENT_NAME}.`,
        /* GEKÜRZT auf Wunsch des Inhabers (23.08.2026): In einer
           Sprechblase liest niemand drei Sätze plus vier Ausnahmen.
           Was er nicht beantwortet, sagt er selbst, und dort steht es
           ausführlicher (config/wissensfragen.ts, WISSENS_ABSAGEN). */
        text: `${ASSISTENT_NAME} ist unser virtueller Assistent. Er sagt Ihnen, wo etwas liegt, wie ein Schritt geht und was eine Leistung kostet. Weiß er nicht weiter, bringt er Sie zu einem Menschen aus unserem Team.`,
      },
    ],
  },
  {
    kennung: "objekt",
    name: "Erklärung zur Objektmaske",
    pfad: "/konto/objekt",
    schritte: [
      {
        ziel: "objekt-schritte",
        bereich: "/konto/objekt",
        titel: "Der Assistent fragt Sie Schritt für Schritt.",
        /* Die Zahl kommt aus ERFASSUNG_SCHRITTE. Genau hier stand in
           der alten Einführung monatelang "sieben". */
        text: `${zahlwortGross(ERFASSUNG_SCHRITTE)} Schritte, und Sie können jederzeit aufhören. Ihre Eingaben werden bei jedem Schritt gespeichert.`,
      },
      {
        ziel: "objekt-hilfe",
        bereich: "/konto/objekt",
        titel: "Zu jedem Feld gibt es eine Erklärung.",
        /* GERÄTENEUTRAL auf Wunsch des Inhabers: "Tippen Sie auf" ist
           Telefonsprache, am Schreibtisch klickt man. */
        text: "Über das Fragezeichen am Feld steht der Begriff in Alltagssprache. Kein Fachwort bleibt unerklärt.",
      },
    ],
  },
  {
    kennung: "fotos",
    name: "Erklärung zu den Fotos",
    pfad: "/konto/fotos",
    schritte: [
      {
        ziel: "fotos-hochladen",
        bereich: "/konto/fotos",
        titel: "Hier laden Sie Ihre Fotos hoch.",
        text: "Ziehen Sie die Bilder in das Feld oder wählen Sie sie aus. Mehrere auf einmal gehen auch.",
      },
      {
        ziel: "fotos-reihenfolge",
        bereich: "/konto/fotos",
        titel: "Die Reihenfolge bestimmen Sie.",
        text: "Schieben Sie die Bilder, bis sie passen. Das erste Foto ist Ihr Titelbild, und in dieser Reihenfolge erscheinen sie im Exposé und auf den Portalen.",
      },
    ],
  },
  {
    kennung: "expose",
    name: "Erklärung zum Exposé",
    pfad: "/konto/expose",
    schritte: [
      {
        ziel: "expose-karte",
        bereich: "/konto/expose",
        titel: "So sieht Ihr Exposé aus.",
        text: "Sie sehen hier dieselbe Fassung, die ein Interessent von Ihnen bekommt. Fehlt etwas, ändern Sie es bei Ihrem Objekt oder bei Ihren Fotos, das Exposé zieht danach nach.",
      },
    ],
  },
  {
    kennung: "anfragen",
    name: "Erklärung zum Posteingang",
    pfad: "/konto/anfragen",
    schritte: [
      {
        ziel: "anfragen-liste",
        bereich: "/konto/anfragen",
        titel: "Eine Zeile ist ein Mensch.",
        text: "Wer über zwei Portale fragt, steht hier trotzdem nur einmal. Alles, was Sie mit dieser Person gewechselt haben, liegt an einer Stelle.",
      },
      {
        ziel: "anfragen-schutzadresse",
        bereich: "/konto/anfragen",
        titel: "Ihr Objekt hat eine eigene Adresse.",
        text: "Sie gehört zu Ihrer Immobilie und steht in Ihrem Inserat.",
        schutzSatz: "schutzAdresse",
      },
    ],
  },

  /* ------------------------------------------------------------------
     Die vier Führungen der Geld- und Anlege-Bereiche. Texte vom
     Inhaber freigegeben (24.08.2026); im vierten Leistungs-Schritt auf
     seine Ansage als Aussage statt Frage ("Fragen an den Nutzer wirken
     in einer Führung wie eine Aufgabe"). Schritte an bedingten
     Karten (Aufträge, laufende Leistungen, Anrechnung, Verfahren nach
     der Frist) überspringt die Laufzeit, solange die Karte fehlt.
     ------------------------------------------------------------------ */
  {
    kennung: "leistungen",
    name: "Erklärung zu den Leistungen",
    pfad: "/konto/leistungen",
    schritte: [
      {
        ziel: "leistungen-katalog",
        bereich: "/konto/leistungen",
        titel: "Alle Leistungen, nach Verkaufsphasen geordnet.",
        text: "Was Ihr Paket schon enthält, ist gekennzeichnet.",
      },
      {
        ziel: "leistungen-auftraege",
        bereich: "/konto/leistungen",
        titel: "Nach einem Kauf entsteht ein Auftrag.",
        text: "Was das Team dafür von Ihnen braucht und wann das Ergebnis da ist, steht am Auftrag selbst.",
      },
      {
        ziel: "leistungen-laufend",
        bereich: "/konto/leistungen",
        titel: "Laufende Leistungen stehen hier mit Datum und Kündigung.",
        text: "Gekündigt wird mit einem Klick, ganz ohne Anruf.",
      },
      {
        ziel: "leistungen-anrechnung",
        bereich: "/konto/leistungen",
        titel: "Frühere Rechnungen werden angerechnet.",
        text: "Die Anrechnungs-Karte zieht sie automatisch ab.",
      },
    ],
  },
  {
    kennung: "termine",
    name: "Erklärung zu den Terminen",
    pfad: "/konto/termine",
    schritte: [
      {
        ziel: "termine-anfragen",
        bereich: "/konto/termine",
        titel: "Hier fragen Sie Gespräche an.",
        text: "Und Sie sehen alle Termine mit ihrem Stand.",
      },
      {
        ziel: "termine-verfuegbarkeit",
        bereich: "/konto/termine",
        titel: "Ihre Verfügbarkeit gilt für Besichtigungen.",
        text: "Interessenten buchen nur dann, wenn es Ihnen passt.",
      },
      {
        ziel: "termine-liste",
        bereich: "/konto/termine",
        titel: "Die Plattform bestätigt für Sie.",
        text: "Jede Zusage und jede Absage bestätigt die Plattform per Mail. Sie müssen nichts nachhalten.",
      },
    ],
  },
  {
    kennung: "interessenten",
    name: "Erklärung zu den Interessenten",
    pfad: "/konto/interessenten",
    schritte: [
      {
        ziel: "interessenten-liste",
        bereich: "/konto/interessenten",
        titel: "Jeder Interessent hat eine Akte.",
        text: "Kontakt, Verlauf und Unterlagen an einem Ort.",
      },
      {
        ziel: "interessenten-anlegen",
        bereich: "/konto/interessenten",
        titel: "Neue Interessenten legen Sie hier an.",
        text: "Aus Anfragen entstehen sie von selbst.",
      },
      {
        ziel: "interessenten-liste",
        bereich: "/konto/interessenten",
        titel: "Verschicken direkt aus der Akte.",
        text: "Exposé-Link und Bonitätsnachweis verschicken Sie direkt aus der Akte.",
      },
    ],
  },
  {
    kennung: "bieterverfahren",
    name: "Erklärung zum Bieterverfahren",
    pfad: "/konto/bieterverfahren",
    schritte: [
      {
        ziel: "bieter-einrichtung",
        bereich: "/konto/bieterverfahren",
        titel: "Ein Bieterverfahren sammelt Gebote in einem festen Zeitraum.",
        text: "Kein Gebot bindet Sie.",
      },
      {
        ziel: "bieter-regeln",
        bereich: "/konto/bieterverfahren",
        titel: "Startpreis und Frist legen Sie bei der Einrichtung fest.",
        text: "Bieter sehen genau dieselben Regeln.",
      },
      {
        ziel: "bieter-entscheiden",
        bereich: "/konto/bieterverfahren",
        titel: "Nach dem Fristende entscheiden Sie.",
        text: "Annehmen, ablehnen oder eine neue Runde.",
      },
    ],
  },
];

/** Eine Führung nachschlagen */
export function fuehrungFinden(kennung: string): Fuehrung | null {
  return FUEHRUNGEN.find((f) => f.kennung === kennung) ?? null;
}

/** Die Führung, die zu einem Pfad gehört, wenn es eine gibt */
export function fuehrungFuerPfad(pfad: string): Fuehrung | null {
  return FUEHRUNGEN.find((f) => f.pfad === pfad) ?? null;
}
