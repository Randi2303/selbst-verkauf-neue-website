/**
 * DIE THEMEN, zwischen denen der Kunde im Zahnrad waehlt.
 *
 * =====================================================================
 * WARUM ES DIESE DATEI GIBT, NEBEN ZWEI VORHANDENEN KATALOGEN
 * =====================================================================
 * Es gibt schon `MELDUNGS_ARTEN` (lib/kunden-meldung.ts, was in der
 * Glocke steht) und `PFLICHT_MAILS` (config/pflicht-mails.ts, was die
 * Abmeldung uebergehen darf). Beide sind richtig und beide taugen
 * NICHT als Grundlage der Einstellung, weil sie nicht deckungsgleich
 * sind:
 *
 *   - Drei Glocken-Arten haben gar keine Mail (`unterlage.geliefert`,
 *     `unterlage.werte_fehlen`, `foto.ki_fertig`).
 *   - Vier Mails haben gar keine Glocken-Art (`auftrag-bestaetigung`,
 *     `nachfassen`, `wartet-kunde`, `zusage-gerissen`).
 *   - Eine Zeile in der Oberflaeche fasst regelmaessig mehrere von
 *     beidem zusammen: "Ihr Termin mit uns" sind drei Glocken-Arten
 *     und drei Mail-Kennungen.
 *
 * Ein THEMA ist die Zeile, die der Kunde sieht. Es nennt seine
 * Glocken-Arten und seine Mail-Kennungen; die Bau-Pruefung
 * (scripts/themen-pruefen.mts) haelt beide Kataloge dagegen und
 * verlangt fuer JEDEN Eintrag dort eine Antwort hier. Ein neuer
 * Eintrag ohne Entscheidung bricht den Bau.
 *
 * =====================================================================
 * NUR DIE MAIL IST ABWAEHLBAR, DIE GLOCKE NIE
 * =====================================================================
 * Entschieden am 30.08.2026 mit dem Inhaber. Drei Gruende:
 *
 *   1. Wer die Glocke abschaltet, verpasst etwas wegen einer
 *      Entscheidung, an die er sich in drei Monaten nicht erinnert.
 *   2. Die Glocke kostet ihn nichts. Sie klopft nirgends an; eine Mail
 *      landet in seiner Tasche. Zwei Wege, die verschieden weh tun,
 *      brauchen nicht dieselbe Wahlmoeglichkeit.
 *   3. Die Glocke ist ueberhaupt erst der Grund, aus dem das
 *      Abschalten der Mail ungefaehrlich ist. Waeren beide abschaltbar,
 *      koennte sich ein Kunde vor seinem eigenen Verkauf unsichtbar
 *      machen.
 *
 * Deshalb traegt ein Thema EINEN Wert und nicht zwei, und
 * `meldeDemKunden` fragt diese Datei nie.
 *
 * =====================================================================
 * WAS NIEMALS EIN THEMA WIRD (Auflage des Inhabers, 30.08.2026)
 * =====================================================================
 * Eine Mail, an der etwas haengt, das ueber den Text hinausgeht, ist
 * Pflicht und bekommt keinen Schalter:
 *
 *   - ein ANHANG (Rechnung als PDF, Kalenderdatei),
 *   - ein LINK, den es nur in dieser Mail gibt (Einmal-Link, Zugang),
 *   - eine FRIST, die mit ihr beginnt (Widerruf, Verzug, Laufzeit).
 *
 * Der Anlass: `besichtigung-zusage` hing bis zum 30.08.2026 am
 * Schalter. An ihr haengt die Kalenderdatei, und an der ABSAGE haengt
 * dieselbe Datei mit STATUS:CANCELLED, die den toten Eintrag aus dem
 * Kalender NIMMT. Der Inhaber: "Das ist kein Hinweis, das ist ein
 * Arbeitsmittel." scripts/pflicht-am-schalter-pruefen.mts setzt den
 * Anhang-Teil dieser Regel durch; Link und Frist kann sie nicht sehen,
 * das steht dort im Kopf.
 */
import type { MeldungsArt } from "@/lib/kunden-meldung";
import { PFLICHT_MAILS, type PflichtMailId } from "@/config/pflicht-mails";

/**
 * Die Gruppen, in der Reihenfolge, in der sie im Feld stehen.
 *
 * ABWEICHUNG VOM VORSCHLAG DES INHABERS, mit Begruendung:
 *   - "Portale" faellt weg. Dort staende genau eine Zeile (das Ende
 *     der bezahlten Schaltung), und die ist eine Geld-Zeile. Der
 *     Portal-EXPORT meldet bewusst nie, weil er bei jeder Aenderung
 *     laeuft.
 *   - "Nachrichten von uns" kommt dazu. Drei Arten haben nichts mit
 *     Interessenten zu tun: Der Absender sind wir.
 *   - "Bieterverfahren" kommt dazu. Der Kunde denkt daran als eigenen
 *     Vorgang mit eigener Frist.
 */
export const THEMEN_GRUPPEN = [
  { id: "anfragen", titel: "Anfragen und Interessenten" },
  { id: "bieterverfahren", titel: "Bieterverfahren" },
  { id: "termine", titel: "Termine" },
  { id: "nachrichten", titel: "Nachrichten von uns" },
  { id: "unterlagen", titel: "Unterlagen und Aufträge" },
] as const;

export type ThemenGruppe = (typeof THEMEN_GRUPPEN)[number]["id"];

export type MeldungsThema = {
  /**
   * Stabile Kennung. Steht so in `meldungs_einstellungen.thema` und
   * darf sich nie aendern; sonst faellt ein Kunde stillschweigend auf
   * die Voreinstellung zurueck.
   */
  id: string;
  /** Der Name in verstaendlicher Sprache, nie die technische Kennung */
  titel: string;
  /** Ein Satz: was loest das aus? */
  satz: string;
  gruppe: ThemenGruppe;
  /** Die Glocken-Arten dieses Themas. Sie bleiben immer an. */
  glocke: readonly MeldungsArt[];
  /** Die Mail-Kennungen dieses Themas. Sie sind abwaehlbar. */
  mail: readonly string[];
};

/**
 * DIE ABWAEHLBAREN THEMEN. Zwoelf Zeilen mit einem Schalter.
 *
 * Die Voreinstellung ist immer AN und steht nicht als Feld dabei: Eine
 * abgeschaltete Voreinstellung waere eine Benachrichtigung, die
 * niemand bestellt und niemand abbestellt hat.
 *
 * `as const satisfies` UND NICHT NUR EINE TYP-ANGABE: Nur so bleiben
 * die Kennungen als LITERALE erhalten, und nur daraus laesst sich
 * `AbschaltbareKennung` ableiten. Diese Ableitung ist der eigentliche
 * Riegel dieser Runde: `sendeHinweis` und `empfaengerFuerHinweis`
 * nehmen nur noch eine Kennung aus dieser Menge an, und damit kann
 * eine Pflicht-Mail gar nicht mehr versehentlich den Schalter-Weg
 * gehen. Kein Muster, keine Suche, ein Uebersetzungsfehler.
 */
export const MELDUNGS_THEMEN = [
  /* ---------------------------------------------------------------- */
  /* Anfragen und Interessenten                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "neue-anfrage",
    titel: "Neue Anfrage",
    satz: "Jemand fragt zu Ihrer Immobilie an, über welchen Weg auch immer.",
    gruppe: "anfragen",
    glocke: ["anfrage.eingegangen"],
    mail: ["anfrage-eingegangen"],
  },
  {
    id: "nachweis-eingereicht",
    titel: "Ein Nachweis ist eingegangen",
    satz:
      "Ein Interessent hat den Bonitäts- oder Finanzierungsnachweis geliefert, den Sie angefordert haben.",
    gruppe: "anfragen",
    glocke: ["nachweis.eingegangen"],
    mail: ["nachweis-hochgeladen"],
  },
  {
    id: "nachfassen",
    titel: "Erinnerung zum Nachfassen",
    satz:
      "Ein Datum, das Sie sich selbst in einer Interessenten-Akte gesetzt haben, ist erreicht.",
    gruppe: "anfragen",
    glocke: [],
    mail: ["nachfassen"],
  },

  /* ---------------------------------------------------------------- */
  /* Bieterverfahren                                                   */
  /* ---------------------------------------------------------------- */
  {
    id: "neues-gebot",
    titel: "Ein Gebot geht ein",
    satz:
      "Jemand bietet oder erhöht sein Gebot. Bei mehreren kurz hintereinander fassen wir zusammen.",
    gruppe: "bieterverfahren",
    glocke: ["gebot.eingegangen"],
    mail: ["neues-gebot", "neues-gebot-sammel"],
  },
  {
    id: "frist-abgelaufen",
    titel: "Die Frist ist abgelaufen",
    satz: "Ihr Bieterverfahren ist beendet, jetzt entscheiden Sie.",
    gruppe: "bieterverfahren",
    glocke: ["gebot.frist_abgelaufen"],
    mail: ["frist-abgelaufen"],
  },

  /* ---------------------------------------------------------------- */
  /* Termine                                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "termin",
    titel: "Ihr Termin mit uns",
    satz:
      "Ein Rückruf, ein Video-Gespräch oder ein Termin vor Ort wird bestätigt, verschoben oder abgesagt.",
    gruppe: "termine",
    glocke: ["termin.zugesagt", "termin.verschoben", "termin.abgesagt"],
    mail: ["termin-bestaetigt", "termin-verschoben", "termin-abgesagt"],
  },

  /* ---------------------------------------------------------------- */
  /* Nachrichten von uns                                               */
  /* ---------------------------------------------------------------- */
  {
    id: "antwort",
    titel: "Antwort auf Ihre Nachricht",
    satz: "Wir oder Ihr Ansprechpartner haben Ihnen geantwortet.",
    gruppe: "nachrichten",
    glocke: ["nachricht.vom_team", "nachricht.vom_makler"],
    mail: ["antwort"],
  },
  {
    id: "fehlermeldung",
    titel: "Antwort auf eine Fehlermeldung",
    satz: "Sie haben uns auf etwas hingewiesen, und wir melden uns dazu.",
    gruppe: "nachrichten",
    glocke: ["problem.beantwortet"],
    mail: ["fehlermeldung"],
  },
  {
    id: "zusage-gerissen",
    titel: "Wenn wir eine Zusage nicht halten",
    satz:
      "Eine Rückmeldung, die wir Ihnen zugesagt haben, ist ausgeblieben. Dann sagen wir Ihnen das von uns aus.",
    gruppe: "nachrichten",
    glocke: [],
    mail: ["wartet-kunde", "zusage-gerissen"],
  },

  /* ---------------------------------------------------------------- */
  /* Unterlagen und Auftraege                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "bewertung",
    titel: "Ihre Markteinschätzung liegt vor",
    satz: "Die Einschätzung zu Ihrer Immobilie ist fertig.",
    gruppe: "unterlagen",
    glocke: ["bewertung.liegt_vor"],
    mail: ["bewertung"],
  },
  {
    id: "auftrag-angelegt",
    titel: "Ein Auftrag ist angelegt",
    satz:
      "Eine bestellte Leistung, die von Hand erbracht wird, ist bei uns in Arbeit.",
    gruppe: "unterlagen",
    glocke: [],
    mail: ["auftrag-bestaetigung"],
  },
  {
    id: "auftrag-fertig",
    titel: "Eine Leistung ist fertig",
    satz: "Das Ergebnis liegt ab sofort in Ihrem Konto.",
    gruppe: "unterlagen",
    glocke: ["auftrag.fertig"],
    mail: ["auftrag-fertig"],
  },
] as const satisfies readonly MeldungsThema[];

/**
 * Die Kennung eines Themas, als Typ. Steht so in der Datenbank.
 */
export type ThemaId = (typeof MELDUNGS_THEMEN)[number]["id"];

/**
 * JEDE Mail-Kennung, die an einem Schalter haengt, als Typ.
 *
 * DAS IST DER RIEGEL: `sendeHinweis` und `empfaengerFuerHinweis`
 * nehmen nur diesen Typ an. Wer eine Pflicht-Mail ueber den
 * Schalter-Weg schicken will, bekommt keinen Bau, und wer eine neue
 * Kennung erfindet, ohne sie einem Thema zuzuordnen, ebenfalls nicht.
 */
export type AbschaltbareKennung = (typeof MELDUNGS_THEMEN)[number]["mail"][number];

/**
 * Was ein Kunde eingestellt hat, ueber alle Themen.
 *
 * STEHT HIER UND NICHT IN lib/meldungs-einstellungen.ts, obwohl er
 * dort entsteht: Jene Datei ist `server-only`, und der Anbieter im
 * Browser braucht denselben Typ. Ein zweiter, gleichlautender Typ auf
 * der Browser-Seite waere genau die Verdopplung, die auseinanderlaeuft.
 */
export type MeldungsWahl = Record<ThemaId, boolean>;

/**
 * NUR IN DER GLOCKE. Diese drei Arten haben heute keine Mail, also
 * gibt es auch nichts abzuschalten.
 *
 * SIE STEHEN TROTZDEM IM FELD, aus demselben Grund, aus dem die
 * Pflicht-Zeilen dort stehen: Der Kunde soll sehen, dass es sie gibt.
 * Eine Zeile, die stumm fehlt, sieht aus wie eine vergessene.
 */
export const NUR_GLOCKE: {
  titel: string;
  satz: string;
  gruppe: ThemenGruppe;
  glocke: MeldungsArt[];
}[] = [
  {
    titel: "Eine bestellte Unterlage ist da",
    satz: "Wir haben eine Unterlage geliefert, die Sie beauftragt haben.",
    gruppe: "unterlagen",
    glocke: ["unterlage.geliefert"],
  },
  {
    titel: "Noch eine Angabe für Ihre Anzeige",
    satz:
      "Aus einer gelieferten Unterlage fehlt noch eine Pflichtangabe in Ihrem Inserat.",
    gruppe: "unterlagen",
    glocke: ["unterlage.werte_fehlen"],
  },
  {
    titel: "Ihre Fotos sind fertig bearbeitet",
    satz: "Die verbesserte Fassung liegt in Ihrer Galerie.",
    gruppe: "unterlagen",
    glocke: ["foto.ki_fertig"],
  },
];

/**
 * DIE PFLICHT-ZEILEN. Kein Schalter, sondern eine ehrliche Zeile.
 *
 * DER INHABER, 30.08.2026: "Ein ausgegrauter Schalter, an dem man
 * vergeblich zieht, ist schlechter als eine ehrliche Zeile."
 *
 * ---------------------------------------------------------------------
 * ZWEI BEGRUENDUNGEN, UND DAS IST KEINE VERDOPPLUNG
 * ---------------------------------------------------------------------
 * Der erste Entwurf las den Satz aus `PFLICHT_MAILS` direkt in die
 * Oberflaeche, mit der Begruendung, zwei Orte mit demselben Satz
 * liefen auseinander. Das Bild hat den Denkfehler gezeigt: Dort stand
 * dann "Zugangs-Mail: Ohne die Einladung kommt ein neuer Kunde nie an
 * sein Konto" auf dem Schirm eines Kunden. Dritte Person, unser
 * Vokabular, und im Haus gilt die Sie-Form.
 *
 * Es sind NICHT dieselben Saetze, sondern zwei Antworten auf zwei
 * verschiedene Fragen:
 *
 *   PFLICHT_MAILS  "Warum darf diese Mail die Abmeldung uebergehen?"
 *                  Gelesen von dem, der nach uns baut. Darf Paragrafen
 *                  und Dateinamen nennen.
 *   kundenGrund    "Warum kann ich das nicht abschalten?" Gelesen vom
 *                  Kunden, in der Sie-Form, ohne unser Vokabular.
 *
 * Die Bau-Pruefung verlangt beide.
 */
export const PFLICHT_GRUPPEN = [
  {
    id: "zugang",
    titel: "Ihr Zugang",
    einleitung:
      "Ohne diese Nachrichten kämen Sie nicht an Ihr Konto, oder eine Änderung daran bliebe unbemerkt.",
  },
  {
    id: "geld",
    titel: "Vertrag und Geld",
    einleitung:
      "Belege und Auskünfte, die Ihnen zustehen, und alles, wo eine Zahlung oder eine Laufzeit beginnt, sich ändert oder endet.",
  },
  {
    id: "arbeitsmittel",
    titel: "Was Sie zum Arbeiten brauchen",
    einleitung:
      "An diesen Nachrichten hängt mehr als ihr Text: ein Anhang, den es sonst nirgends gibt.",
  },
  {
    id: "betrieb",
    titel: "Betrieb",
    einleitung: "Wenn bei uns etwas hakt, das Ihren Verkauf betrifft.",
  },
] as const;

export type PflichtGruppe = (typeof PFLICHT_GRUPPEN)[number]["id"];

export type PflichtZeile = {
  titel: string;
  gruppe: PflichtGruppe;
  /**
   * WARUM SIE DAS NICHT ABSCHALTEN KOENNEN, an den Kunden gerichtet.
   * Sie-Form, kein Vokabular aus dem Maschinenraum. Nicht zu
   * verwechseln mit der Begruendung in config/pflicht-mails.ts, die
   * eine andere Frage beantwortet und an uns gerichtet ist.
   */
  kundenGrund: string;
  /** Die Kennungen. Jede MUSS in PFLICHT_MAILS stehen. */
  mail: PflichtMailId[];
  /** Glocken-Arten, die dazugehoeren; oft keine. */
  glocke: MeldungsArt[];
};

export const PFLICHT_ZEILEN: PflichtZeile[] = [
  /* Zugang */
  {
    titel: "Einladung in Ihr Konto",
    kundenGrund:
      "Ohne diese E-Mail kämen Sie gar nicht erst an Ihr Konto. Zu dem Zeitpunkt gibt es auch noch nichts, was Sie hätten abbestellen können.",
    gruppe: "zugang",
    mail: ["einladung", "einladung-oder-passwort"],
    glocke: [],
  },
  {
    titel: "Neues Passwort",
    kundenGrund:
      "Wenn Sie ein neues Passwort anfordern, ist genau diese E-Mail das, was Sie haben wollen.",
    gruppe: "zugang",
    mail: ["passwort"],
    glocke: [],
  },
  {
    titel: "Wechsel Ihrer Anmelde-Adresse",
    kundenGrund:
      "Die eine Nachricht geht an die neue Adresse, sonst gäbe es keinen Wechsel. Die andere geht an Ihre bisherige, damit Sie es sofort merken, falls den Wechsel nicht Sie veranlasst haben.",
    gruppe: "zugang",
    /* Zwei Kennungen, zwei Empfaenger: die Bestaetigung an die NEUE
       Adresse, der Sicherheits-Hinweis an die ALTE. */
    mail: ["email-wechsel", "email-wechsel-hinweis"],
    glocke: [],
  },

  /* Vertrag und Geld */
  {
    titel: "Ihre Bestellbestätigung",
    kundenGrund:
      "Sie haben einen gesetzlichen Anspruch darauf, Ihren Vertragsschluss samt Inhalt schriftlich zu bekommen (Paragraf 312f BGB).",
    gruppe: "geld",
    mail: ["bestellbestaetigung"],
    glocke: [],
  },
  {
    titel: "Ihre Rechnung",
    kundenGrund:
      "Eine Rechnung ist ein Beleg und keine Benachrichtigung. Sie brauchen sie für Ihre Unterlagen.",
    gruppe: "geld",
    mail: ["rechnung"],
    glocke: [],
  },
  {
    titel: "Eine Abbuchung ist nicht durchgegangen",
    kundenGrund:
      "Wenn Sie davon nichts erfahren, geraten Sie ohne Ihr Wissen in Verzug.",
    gruppe: "geld",
    mail: ["zahlung-fehlgeschlagen"],
    glocke: ["zahlung.fehlgeschlagen"],
  },
  {
    titel: "Eingang Ihrer Kündigung",
    kundenGrund:
      "Die Bestätigung, dass Ihre Kündigung bei uns angekommen ist, mit Datum und Uhrzeit. Auch die schreibt das Gesetz vor (Paragraf 312k BGB).",
    gruppe: "geld",
    mail: ["kuendigung-eingang"],
    glocke: [],
  },
  {
    titel: "Ihre Portalschaltung endet",
    kundenGrund:
      "Ihr Inserat läuft zu einem festen Datum aus. Ohne diese Nachricht verschwände es, ohne dass Sie es kommen sehen, und Sie verlören Sichtbarkeit, für die Sie bezahlt haben.",
    gruppe: "geld",
    mail: ["schaltung-erinnerung"],
    glocke: ["schaltung.laeuft_ab", "schaltung.abgelaufen"],
  },
  {
    titel: "Ihre Portalschaltung ist noch nicht gestartet",
    kundenGrund:
      "Ihre Schaltung ist gekauft und wartet auf die Veröffentlichung. Läuft die Frist dafür ab, endet Ihr Anspruch darauf. Ohne diese Nachricht verlören Sie eine bezahlte Leistung, ohne je davon zu hören.",
    gruppe: "geld",
    mail: ["schaltung-start-erinnerung"],
    glocke: ["schaltung.start_frist", "schaltung.start_verfallen"],
  },
  {
    titel: "Ihr Ansprechpartner steht fest",
    kundenGrund:
      "Mit der Zuweisung beginnt Ihre Laufzeit und die monatliche Abrechnung. Es ist der einzige Vorgang bei uns, bei dem ohne Ihr Zutun eine wiederkehrende Abbuchung anfängt; davon dürfen Sie nicht erst auf dem Kontoauszug erfahren.",
    gruppe: "geld",
    mail: ["makler-zugewiesen"],
    glocke: ["makler.zugewiesen"],
  },
  {
    titel: "Ihr Verkauf ist eingetragen",
    kundenGrund:
      "Mit dieser Meldung endet Ihr Inserat sofort, laufende Leistungen enden zum Monatsende, und wir beginnen eine Frist von sechs Monaten auf Ihre Interessenten-Akten. Das sollen Sie schriftlich haben, nicht nur als Hinweis im Dialog: Sie brauchen es, wenn Sie später etwas herunterladen möchten.",
    gruppe: "geld",
    mail: ["verkauf-gemeldet"],
    glocke: ["verkauf.gemeldet"],
  },
  {
    titel: "Eine Leistung ist beendet",
    kundenGrund:
      "Hier endet ein Vertrag und eine wiederkehrende Abbuchung. Sie sollen schwarz auf weiß haben, was zu welchem Tag geendet hat und wofür wir zuletzt abgebucht haben; auf dem Kontoauszug steht nur eine Zahl.",
    gruppe: "geld",
    mail: ["kuendigung-wirksam"],
    glocke: ["vertrag.beendet"],
  },
  {
    titel: "Sie haben ein Gebot angenommen",
    kundenGrund:
      "Mit der Annahme sind Sie dem Bieter gegenüber gebunden. Die Bestätigung mit dem Betrag gehört zu Ihren Unterlagen.",
    gruppe: "geld",
    mail: ["gebot-angenommen-verkaeufer"],
    glocke: [],
  },

  /* Arbeitsmittel */
  {
    titel: "Zu- und Absagen zu einer Besichtigung",
    kundenGrund:
      "An diesen beiden E-Mails hängt der Termineintrag für Ihren Kalender. Bei einer Absage nimmt er den Termin auch wieder heraus. Ohne sie hätten Sie am Samstagmorgen einen Eintrag, der nicht mehr stimmt, oder gar keinen.",
    gruppe: "arbeitsmittel",
    /* AM 30.08.2026 VOM SCHALTER IN DIE PFLICHT GEHOLT. An beiden
       Mails haengt die Kalenderdatei; an der ABSAGE haengt sie mit
       STATUS:CANCELLED und nimmt den toten Eintrag aus dem Kalender.
       Ohne sie steht ein abgesagter Termin fuer immer als bestaetigt
       drin. */
    mail: ["besichtigung-zusage", "besichtigung-absage"],
    glocke: ["besichtigung.zugesagt", "besichtigung.abgesagt"],
  },

  /* Betrieb */
  {
    titel: "Wenn wir Anfrage-Mails bremsen",
    kundenGrund:
      "Wenn zu Ihrer Immobilie ungewöhnlich viele Anfragen eingehen, halten wir die einzelnen Mails an. Dann müssen Sie erfahren, dass Anfragen bei uns liegen, sonst warten Sie auf etwas, das nicht kommt.",
    gruppe: "betrieb",
    mail: ["anfragen-gebremst"],
    glocke: [],
  },
];

/**
 * MAILS, DIE NICHT AN DEN KUNDEN GEHEN, und deshalb keinen Schalter
 * haben koennen. Ausdruecklich aufgezaehlt und nicht stillschweigend
 * uebergangen: Die Bau-Pruefung geht von ALLEN Sende-Stellen aus und
 * verlangt fuer jede Kennung eine Antwort. Ohne diese Liste waere die
 * Antwort auf zwei Drittel der Kennungen "kenne ich nicht", und genau
 * das soll die Pruefung ja beanstanden.
 *
 * Die Kategorie "kenne ich nicht" bleibt trotzdem bestehen; sie ist
 * nur leer. Vorbild: scripts/variablen-pruefen.mts.
 */
export const NICHT_AN_DEN_KUNDEN: Record<string, string> = {
  /* An Interessenten: Menschen ohne Konto bei uns. Der Verkaeufer darf
     nicht ueber ihren Posteingang bestimmen. */
  "expose-link": "an den Interessenten",
  "bonitaet-anfordern": "an den Interessenten",
  "nachweis-eingegangen": "an den Interessenten",
  "gebot-einladung": "an den Interessenten",
  "gebot-eingegangen": "an den Interessenten",
  "gebot-angenommen-bieter": "an den Interessenten",
  "gebot-entscheidung-absage": "an den Interessenten",
  "besichtigung-vorschlag": "an den Interessenten",
  "besichtigung-bestaetigt": "an den Interessenten",
  "besichtigung-verschoben": "an den Interessenten",
  "besichtigung-abgesagt": "an den Interessenten",
  "besichtigung-erinnerung": "an den Interessenten",
  "nachricht-an-interessent": "an den Interessenten",
  "wartet-interessent": "an den Interessenten",
  /* An uns selbst */
  "wartet-team": "an das Team",
  "wartet-makler": "an den Makler",
  /* Die Ersatz-Zustellung fuer Meldungen, solange n8n fehlt
     (31.08.2026, lib/ereignis.ts MELDUNG_PER_MAIL): Sie geht an das
     eigene Meldungs-Postfach und nie an einen Kunden. Ein Schalter
     waere hier sogar gefaehrlich, denn ein Kunde koennte Meldungen
     ueber seinen eigenen Vorgang abschalten. */
  "team-meldung": "an das Team",
};

/* -------------------------------------------------------------------- */
/* Nachschlagen                                                          */
/* -------------------------------------------------------------------- */

/** Alle Mail-Kennungen, die an einem Schalter haengen */
export const ABSCHALTBARE_KENNUNGEN: ReadonlySet<string> = new Set<string>(
  MELDUNGS_THEMEN.flatMap((t) => [...t.mail])
);

/** Alle Themen-Kennungen, in Katalog-Reihenfolge */
export const THEMEN_IDS: readonly ThemaId[] = MELDUNGS_THEMEN.map((t) => t.id);

/**
 * Zu welchem Thema gehoert diese Mail-Kennung? `null` heisst: an
 * keinem Schalter, also geht sie immer hinaus.
 */
export function themaZurKennung(kennung: string): MeldungsThema | null {
  return (
    MELDUNGS_THEMEN.find((t) => (t.mail as readonly string[]).includes(kennung)) ??
    null
  );
}

/** Die Themen einer Gruppe, in Katalog-Reihenfolge */
export function themenDerGruppe(gruppe: ThemenGruppe): readonly MeldungsThema[] {
  return MELDUNGS_THEMEN.filter((t) => t.gruppe === gruppe);
}

/** Die Nur-Glocke-Zeilen einer Gruppe */
export function nurGlockeDerGruppe(gruppe: ThemenGruppe) {
  return NUR_GLOCKE.filter((z) => z.gruppe === gruppe);
}

/**
 * Der Satz, den der KUNDE liest. Siehe den Kopf der Pflicht-Zeilen:
 * Er beantwortet eine andere Frage als der Satz in
 * config/pflicht-mails.ts und ist deshalb keine Verdopplung.
 */
export function pflichtZeilenGrund(zeile: PflichtZeile): string {
  return zeile.kundenGrund;
}

/**
 * Der Satz, den WIR lesen: warum diese Mail die Abmeldung uebergehen
 * darf. Aus config/pflicht-mails.ts, nie abgeschrieben. Bei mehreren
 * Kennungen gilt die erste; die uebrigen sind Varianten desselben
 * Vorgangs.
 */
export function pflichtHausGrund(zeile: PflichtZeile): string {
  return PFLICHT_MAILS[zeile.mail[0]];
}
