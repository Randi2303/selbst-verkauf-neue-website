/**
 * Kalenderdatei (.ics) zu einem bestaetigten Termin.
 *
 * WARUM EINE DATEI UND KEINE ANBINDUNG:
 * Eine Datei funktioniert bei Apple, Google und Outlook gleichermassen,
 * und zwar ohne dass wir Zugriff auf fremde Kalender brauchen. Der
 * Kunde tippt einmal, der Termin steht drin. Jede Anbindung waere ein
 * eigener Vertrag, ein eigener Zugang und ein eigener Ausfallgrund.
 *
 * WARUM DIE KENNUNG STABIL BLEIBT:
 * Jeder Kalender erkennt einen Eintrag an seiner UID. Bleibt sie beim
 * Verschieben gleich und steigt nur SEQUENCE, ersetzt das Programm den
 * vorhandenen Eintrag. Waere die UID neu, staenden nach einer
 * Verschiebung zwei Termine im Kalender, der alte zur falschen Zeit.
 * Deshalb leitet sich die UID allein aus der Termin-Id ab, und
 * SEQUENCE zaehlt die Aenderungen.
 *
 * Der Zeilenumbruch ist CRLF und die Faltung bei 75 Zeichen ist Pflicht
 * (RFC 5545). Manche Programme sind da grosszuegig, Outlook nicht.
 */
import { TERMIN_ARTEN, type TerminArt } from "@/lib/termin-arten";
import { siteConfig } from "@/site.config";

export type { TerminArt };

export type KalenderTermin = {
  id: string;
  art: TerminArt;
  thema: string | null;
  termin_zeit: string;
  termin_link: string | null;
  status: string;
  /** Zaehlt hoch, sobald ein Termin verschoben oder abgesagt wurde */
  verschoben_am: string | null;
  /** Adresse des Objekts, nur bei Terminen vor Ort */
  objektAdresse?: string | null;
  /**
   * Was bei einem Vor-Ort-Termin gemacht wird, als fertiger Satz.
   * Gerechnet aus den offenen Auftraegen (lib/vor-ort.ts) und hier nur
   * durchgereicht: Diese Datei hat keinen Datenbank-Zugang und soll
   * auch keinen bekommen.
   */
  vorOrtAufgaben?: string | null;
};

function zeitstempel(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Zeilen falten und Sonderzeichen schuetzen, wie es RFC 5545 verlangt */
function feld(name: string, wert: string): string {
  const sauber = wert
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
  const zeile = `${name}:${sauber}`;
  const teile: string[] = [];
  for (let i = 0; i < zeile.length; i += 73) {
    teile.push((i === 0 ? "" : " ") + zeile.slice(i, i + 73));
  }
  return teile.join("\r\n");
}

/**
 * Die Kalenderdatei als Text.
 *
 * Bei einem abgesagten Termin wird METHOD:CANCEL gesetzt und der
 * Status auf CANCELLED. Wer die Datei dann oeffnet, dessen Kalender
 * entfernt den Eintrag, statt einen zweiten anzulegen.
 */
export function kalenderDatei(t: KalenderTermin): string {
  /* MIT RUECKFALL, und der ist keine Vorsicht ohne Anlass: Diese
     Funktion bekommt `art` aus der Datenbank. Steht dort eine Kennung,
     die der Katalog nicht kennt (etwa eine alte, weil eine Migration
     noch nicht gelaufen ist), waere ein direkter Zugriff ein Absturz
     und der Kunde bekaeme statt seiner Datei eine 500. Der Rueckruf
     ist der harmloseste Eintrag: eine Viertelstunde, kein Ort, eine
     Stunde Vorlauf. */
  const eintrag = TERMIN_ARTEN[t.art] ?? TERMIN_ARTEN.rueckruf;
  const beginn = new Date(t.termin_zeit);
  const ende = new Date(beginn.getTime() + eintrag.dauerMinuten * 60_000);
  const abgesagt = t.status === "abgesagt";
  // Die Kennung haengt allein an der Termin-Id, damit ein Kalender den
  // vorhandenen Eintrag ersetzt statt einen zweiten anzulegen.
  const uid = `termin-${t.id}@selbst-verkauf.de`;
  const folge = t.verschoben_am ? 1 : 0;

  const titel = [eintrag.label, t.thema].filter(Boolean).join(": ");
  /* DER ORT FOLGT DEM MERKMAL, nicht einer Kette von Kennungen. Bis
     Runde 20 fiel die Besichtigung mit Makler hier durch auf
     "Telefonisch", weil sie in keinem der beiden Zweige stand. */
  const ort = eintrag.beimObjekt
    ? (t.objektAdresse ?? "Bei Ihrer Immobilie")
    : t.art === "videogespraech"
      ? (t.termin_link ?? "Video-Gespräch, den Link bekommen Sie rechtzeitig")
      : "Telefonisch";

  const beschreibung = [
    eintrag.kalenderText,
    /* WAS BEI DER FAHRT GEMACHT WIRD, steht im Kalender des Kunden,
       wenn es der Aufrufer mitgibt. Gerechnet aus den offenen
       Auftraegen (lib/vor-ort.ts), hier nur durchgereicht. */
    t.vorOrtAufgaben ?? null,
    t.termin_link ? `Link: ${t.termin_link}` : null,
    `Ihre Termine im Konto: ${siteConfig.domain}/konto/termine`,
  ]
    .filter(Boolean)
    .join("\n");

  const zeilen = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//selbst-verkauf.de//Termine//DE",
    "CALSCALE:GREGORIAN",
    `METHOD:${abgesagt ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    feld("UID", uid),
    `SEQUENCE:${folge}`,
    `DTSTAMP:${zeitstempel(new Date(t.verschoben_am ?? t.termin_zeit))}`,
    `DTSTART:${zeitstempel(beginn)}`,
    `DTEND:${zeitstempel(ende)}`,
    feld("SUMMARY", titel),
    feld("DESCRIPTION", beschreibung),
    feld("LOCATION", ort),
    `STATUS:${abgesagt ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    // Erinnerung: bei allem beim Objekt einen Tag vorher, sonst eine
    // Stunde. Wer fotografieren laesst, muss vorher aufraeumen; das
    // gilt seit 0045 fuer die Besichtigung genauso, und der Vorlauf
    // steht deshalb am Merkmal statt an einer Kennung.
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    feld("DESCRIPTION", `Erinnerung: ${titel}`),
    `TRIGGER:-PT${eintrag.erinnerungStunden}H`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return zeilen.join("\r\n") + "\r\n";
}

/** Dateiname, den ein Kalender-Programm anzeigt */
export function kalenderDateiname(t: { art: TerminArt; termin_zeit: string }): string {
  const d = new Date(t.termin_zeit);
  const p = (n: number) => String(n).padStart(2, "0");
  return `selbst-verkauf-${t.art}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.ics`;
}

/* ------------------------------------------------------------------ */
/* Besichtigungen mit Interessenten                                    */
/*                                                                     */
/* Eigene Funktion statt eines weiteren Falls in kalenderDatei():      */
/* Eine Besichtigung hat eine eigene Dauer, zwei verschiedene          */
/* Empfaenger und einen anderen Ort-Begriff. Die zwei Faelle           */
/* zusammenzuquetschen haette beide Seiten unleserlich gemacht.        */
/*                                                                     */
/* ZWEI SEITEN, EINE UID: Verkaeufer und Interessent bekommen          */
/* dieselbe UID. Das ist richtig so, es IST derselbe Termin, und die   */
/* Kalender der beiden haben nichts miteinander zu tun. Wichtig ist    */
/* nur, dass EINE Seite bei einer Verschiebung nicht zwei Eintraege    */
/* bekommt, und dafuer sorgt die gleichbleibende UID plus folge.       */
/* ------------------------------------------------------------------ */

export type KalenderBesichtigung = {
  id: string;
  beginn: string;
  dauer_minuten: number;
  status: string;
  /** Zaehlt jede Aenderung am Zeitpunkt mit, siehe Migration 0031 */
  folge: number;
  /** Was der Empfaenger vom Ort sehen darf */
  ort: string;
  /** Bezeichnung des Objekts, etwa "Einfamilienhaus in Sendenhorst" */
  objektBezeichnung: string;
  /** Der Interessent steht nur im Kalender des Verkaeufers */
  interessentName?: string | null;
  /**
   * Der Weg zum Absagen oder Verschieben, je Seite ein anderer.
   *
   * WOZU: Wer den Termin Wochen spaeter im Kalender vor sich hat, hat
   * die Mail laengst nicht mehr im Blick. Ohne diesen Link muss er sie
   * heraussuchen, und genau daran scheitert eine rechtzeitige Absage.
   *
   * SICHERHEIT: Fuer den Interessenten ist das sein Einmal-Link, also
   * derselbe zeitlich begrenzte und zweckgebundene Zugang wie in der
   * Mail, nicht mehr und nicht weniger. Ein Kalender-Eintrag wird zwar
   * leicht weitergeleitet, aber die Mail auch, und der Link gibt nichts
   * frei, was ueber diesen einen Termin hinausgeht. Fuer den Verkaeufer
   * ist es schlicht der Weg in sein Konto, das hinter der Anmeldung
   * liegt.
   */
  absageLink?: string | null;
  /** Wer erreichbar ist, wenn etwas dazwischenkommt */
  ansprechpartner?: string | null;
  /** Terminart (Migration 0042); steuert Titel und Beschreibung */
  art?: "einzeltermin" | "zeitfenster" | "gruppentermin";
};

/**
 * Die Kalenderdatei zu einer Besichtigung.
 *
 * "seite" entscheidet ueber Titel und Beschreibung. Der Verkaeufer will
 * wissen, WEN er trifft, der Interessent WAS er sich ansieht.
 *
 * Die Erinnerung sitzt bei beiden auf zwei Stunden vorher. Ein Tag
 * waere zu frueh (der Termin steht ja schon im Kalender), eine Stunde
 * zu spaet fuer eine Anfahrt.
 */
export function besichtigungKalenderDatei(
  b: KalenderBesichtigung,
  seite: "verkaeufer" | "interessent"
): string {
  const beginn = new Date(b.beginn);
  const ende = new Date(beginn.getTime() + b.dauer_minuten * 60_000);
  const abgesagt = b.status === "abgesagt" || b.status === "verfallen";
  const uid = `besichtigung-${b.id}@selbst-verkauf.de`;

  /* Die Art muss im Eintrag erkennbar sein: Wer drei Wochen spaeter in
     seinen Kalender schaut, soll wissen, ob er allein besichtigt oder
     mit anderen. */
  const artWort =
    b.art === "gruppentermin"
      ? "Gruppenbesichtigung"
      : b.art === "zeitfenster"
        ? "Besichtigung (eigenes Zeitfenster)"
        : "Besichtigung";
  const titel =
    seite === "verkaeufer"
      ? `${artWort}${b.interessentName ? `: ${b.interessentName}` : ""}`
      : `${artWort}: ${b.objektBezeichnung}`;

  /* Der Absage-Weg steht ZUERST in der Beschreibung, nicht am Ende.
     Viele Kalender zeigen nur die ersten Zeilen an, und wer den Eintrag
     oeffnet, sucht genau diese eine Angabe. */
  const absageZeile = b.absageLink
    ? seite === "verkaeufer"
      ? `Verschieben oder absagen: ${b.absageLink}`
      : `Absagen, falls Ihnen etwas dazwischenkommt: ${b.absageLink}`
    : null;

  const beschreibung = [
    seite === "verkaeufer"
      ? `Besichtigung Ihrer Immobilie${b.interessentName ? ` mit ${b.interessentName}` : ""}.`
      : `Besichtigung von ${b.objektBezeichnung}.`,
    b.art === "gruppentermin"
      ? "Gemeinsamer Termin mit mehreren Interessenten."
      : b.art === "zeitfenster"
        ? seite === "verkaeufer"
          ? "Ein Fenster einer Zeitfenster-Serie."
          : "Ihr eigenes Zeitfenster, die Zeit gehört Ihnen allein."
        : null,
    `Ort: ${b.ort}`,
    b.ansprechpartner ? `Ansprechpartner: ${b.ansprechpartner}` : null,
    absageZeile,
  ]
    .filter(Boolean)
    .join("\n");

  const zeilen = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//selbst-verkauf.de//Besichtigungen//DE",
    "CALSCALE:GREGORIAN",
    `METHOD:${abgesagt ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    feld("UID", uid),
    `SEQUENCE:${b.folge}`,
    `DTSTAMP:${zeitstempel(new Date())}`,
    `DTSTART:${zeitstempel(beginn)}`,
    `DTEND:${zeitstempel(ende)}`,
    feld("SUMMARY", titel),
    feld("DESCRIPTION", beschreibung),
    feld("LOCATION", b.ort),
    /* URL ist das dafuer vorgesehene Feld (RFC 5545). Apple Kalender
       und Outlook zeigen es als anklickbaren Verweis, Google ignoriert
       es. Deshalb steht der Link zusaetzlich im Text und nicht nur
       hier. */
    ...(b.absageLink ? [feld("URL", b.absageLink)] : []),
    `STATUS:${abgesagt ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    feld("DESCRIPTION", `Erinnerung: ${titel}`),
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return zeilen.join("\r\n") + "\r\n";
}

/** Dateiname der Besichtigungs-Datei */
export function besichtigungDateiname(b: { beginn: string }): string {
  const d = new Date(b.beginn);
  const p = (n: number) => String(n).padStart(2, "0");
  return `besichtigung-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.ics`;
}
