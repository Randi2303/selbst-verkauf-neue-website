/**
 * DIE eine Stelle fuer Laufzeiten, Fristen und ihre Herleitung.
 *
 * Entschieden am 10.08.2026. Website, Konfigurator, Kasse, Konto und
 * Mails lesen ausschliesslich hier; wer eine Dauer aendern will,
 * aendert genau eine Konstante.
 *
 * DAS MODELL IN EINEM ABSATZ: Der Zugang und alle einmaligen Arbeiten
 * laufen unbefristet weiter (Konto, Objektdaten, Markteinschaetzung,
 * Expose, Unterlagen, Checklisten). Befristet ist NUR die
 * Portalschaltung, weil nur sie an unsere laufenden Portalvertraege
 * gebunden ist. Monatlich ist die Makler-Begleitung, weil dort
 * Arbeitszeit steckt, und das monatliche Paketmodell.
 */

/* RELATIV, nicht als "@/lib/utils": site.config.ts zieht diese Datei,
   und der Build wertet site.config auch ausserhalb des Bundlers aus
   (jiti), wo der Alias nicht aufgeloest wird. */
import { formatDatum } from "./utils";

/** Monate Portalschaltung, die in den Paketen und der Einzelbuchung stecken */
export const SCHALTUNG_MONATE = 6;

/**
 * Die Schaltung muss innerhalb dieser Frist nach dem Kauf gestartet
 * werden, sonst verfaellt sie. Gerechnet ab Buchung, gestartet wird
 * mit der Veroeffentlichung des Inserats.
 */
export const SCHALTUNG_START_FRIST_MONATE = 12;

/**
 * AB WELCHEM KAUFTAG DIE FRIST GILT. Format "JJJJ-MM-TT".
 *
 * ---------------------------------------------------------------------
 * GESETZT AM 30.08.2026 AUF DEN 31.08.2026
 * ---------------------------------------------------------------------
 * `null` hiesse: Die Frist gilt fuer NIEMANDEN. Mit einem Datum gilt
 * sie fuer alle Kaeufe ab diesem Tag, und nur fuer die.
 *
 * DER TAG IST DER TAG NACH DEM AUSROLLEN, und das ist kein Zufall:
 * Zwischen dem Push und dem Moment, in dem der Text wirklich auf der
 * Seite steht, liegt der Bau bei Hostinger. In dieser Luecke soll
 * niemand einer Regel unterliegen, die er noch nicht lesen konnte
 * (Festlegung des Inhabers, 30.08.2026).
 *
 * Eingetragen wurde er erst, nachdem der Inhaber selbst nachgesehen
 * hat, dass der Satz auf der Leistungs-Seite und in der Kasse steht.
 * Die ausgerollte Seite antwortet mit 401, von hier aus ist sie nicht
 * pruefbar.
 *
 * WARUM EIN FESTER TAG UND NICHT DAS DATUM DES AUSROLLENS: Ein
 * Vergleich mit dem Bereitstellungszeitpunkt waere nirgends
 * nachlesbar und beim naechsten Ausrollen ein anderer. Hier steht er
 * als Zahl, an einer Stelle, und laesst sich Jahre spaeter noch
 * begruenden.
 *
 * Verglichen wird mit `buchungen.gebucht_am`.
 */
export const SCHALTUNG_START_FRIST_AB: string | null = "2026-08-31";

/** So viele Tage vor dem Ende der Schaltung wird ruhig erinnert */
export const SCHALTUNG_ERINNERUNG_TAGE = 14;

/**
 * So viele Tage vor dem Ablauf der Start-Frist wird an die noch nicht
 * gestartete Schaltung erinnert. Zwei Monate, weil der Kunde in dieser
 * Zeit etwas TUN muss: Fotos, Unterlagen und Energieausweis
 * zusammenbekommen, und ein Teil davon haengt an Aemtern, die ihre
 * eigene Geschwindigkeit haben. Vierzehn Tage wie bei der
 * Ende-Erinnerung waeren hier eine Nachricht, auf die niemand mehr
 * reagieren kann.
 */
export const SCHALTUNG_START_ERINNERUNG_TAGE = 60;

/**
 * Verlaengerung der Schaltung je Monat in Euro.
 * TODO Preis: PLATZHALTER, bis das Immowelt-Angebot vorliegt und der
 * Preis festgelegt ist. Ueberall, wo er erscheint, steht "vorlaeufig".
 */
export const VERLAENGERUNG_PREIS_VORLAEUFIG = 89;

/** Leistungs-ID der Verlaengerung, an ihr haengt die Freischaltung */
export const VERLAENGERUNG_LEISTUNG = "laufzeit-verlaengerung";

/**
 * Wohin die Erinnerungsmail fuehrt.
 *
 * SIE MUSS AUF GENAU DEN WEG ZEIGEN, den sie anbietet. Vorher lud sie
 * zum Verlaengern ein und verwies auf die Leistungsuebersicht, in der
 * die Verlaengerung eine von zwei Dutzend Karten war. Wer eingeladen
 * wird, soll nicht suchen muessen.
 */
export const VERLAENGERUNG_ANKER = `/konto/leistungen#${VERLAENGERUNG_LEISTUNG}`;

/**
 * Mindestlaufzeit des monatlichen Paketmodells in Monaten. Danach
 * laeuft der Vertrag unbefristet und ist zum Ende jedes Monats
 * kuendbar; es gibt KEINE automatische Verlaengerung um feste
 * Zeitraeume. Die Begruendung steht ehrlich daneben, nie im
 * Kleingedruckten: Die Aufbereitung (Erfassung, Markteinschaetzung,
 * Expose) geschieht im ersten Monat.
 */
export const PAKET_MINDESTLAUFZEIT_MONATE = 3;

/**
 * Die Makler-Begleitung hat KEINE Mindestlaufzeit: laufende Betreuung,
 * keine Vorleistung. Sie beginnt mit der Zuweisung des
 * Ansprechpartners, nicht mit der Buchung, und endet beim Verkauf von
 * selbst zum Monatsende. Angefangene Monate werden nicht anteilig
 * erstattet, der laufende Monat wird zu Ende gefuehrt.
 */
export const MAKLER_BEGLEITUNG_MONATLICH_KUENDBAR = true;

/* ------------------------------------------------------------------ */
/* Herleitungen                                                        */
/* ------------------------------------------------------------------ */

/** Monatsende des Monats, in dem der Zeitpunkt liegt (fuer Kuendigungen) */
export function monatsende(ab: Date = new Date()): Date {
  return new Date(ab.getFullYear(), ab.getMonth() + 1, 0, 23, 59, 59);
}

/**
 * Ende der Schaltung: Veroeffentlichung plus SCHALTUNG_MONATE plus
 * die zusaetzlich gekauften Monate.
 *
 * GERECHNET WIRD AB DEM BISHERIGEN ENDE, nie ab dem Kauf. Das ist die
 * einzige faire Variante: Wer drei Wochen vor Ablauf verlaengert, hat
 * diese drei Wochen bereits bezahlt und darf sie nicht verlieren.
 * Rechnerisch faellt das hier von selbst heraus, weil beide Summanden
 * auf denselben Anfang addiert werden.
 */
export function schaltungEnde(veroeffentlichtAm: Date, zusatzMonate = 0): Date {
  const ende = new Date(veroeffentlichtAm);
  ende.setMonth(ende.getMonth() + SCHALTUNG_MONATE + Math.max(0, zusatzMonate));
  return ende;
}

/** Verfallsdatum einer noch nicht gestarteten Schaltung */
export function schaltungVerfall(gebuchtAm: Date): Date {
  const verfall = new Date(gebuchtAm);
  verfall.setMonth(verfall.getMonth() + SCHALTUNG_START_FRIST_MONATE);
  return verfall;
}

/**
 * Der Kalendertag eines Zeitpunkts in Europe/Berlin, als "JJJJ-MM-TT".
 *
 * Fest verdrahtete Zone wie ueberall im Haus (lib/meldungs-zeit.ts):
 * Auf einem Server in UTC waere der 31. um 01:00 Ortszeit sonst noch
 * der 30., und ein Kauf faellt auf die falsche Seite der Frist.
 */
function berlinTag(zeitpunkt: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(zeitpunkt);
}

/**
 * Bis wann muss diese Buchung ihre Schaltung gestartet haben?
 *
 * `null` heisst: fuer diese Buchung gilt die Frist nicht. Das ist der
 * Fall, solange kein Stichtag gesetzt ist, UND fuer jeden Kauf vor dem
 * Stichtag.
 *
 * ---------------------------------------------------------------------
 * WARUM DER STICHTAG UEBERHAUPT MITKOMMT
 * ---------------------------------------------------------------------
 * Festlegung des Inhabers, 30.08.2026: "Die Frist gilt fuer Kaeufe ab
 * dem Tag, an dem der Satz ausgerollt ist." Wer vorher gekauft hat,
 * konnte sie nicht lesen, und was man nicht lesen konnte, kann man
 * niemandem entgegenhalten.
 *
 * Der zweite Parameter ist NICHT fuer den Betrieb da, sondern fuer den
 * Nachweis: Er laesst sich in einer Probe setzen, damit beide
 * Richtungen belegbar sind, bevor der echte Stichtag eingetragen ist
 * (scripts/frist-probe.mts).
 */
export function startFristEnde(
  gebuchtAm: Date,
  abTag: string | null = SCHALTUNG_START_FRIST_AB
): Date | null {
  if (!abTag) return null;
  if (berlinTag(gebuchtAm) < abTag) return null;
  return schaltungVerfall(gebuchtAm);
}

/**
 * Der Stand einer Portalschaltung, an EINER Stelle gerechnet.
 *
 * ---------------------------------------------------------------------
 * WARUM EIN TYP UND KEIN WAHRHEITSWERT
 * ---------------------------------------------------------------------
 * Die Sperre, die Erinnerung und die Glocke stellen dieselbe Frage,
 * brauchen aber verschiedene Antworten: Die Sperre will wissen, ob
 * gerade etwas laeuft; die Erinnerung will das Datum; die Glocke will
 * den GRUND, weil sie ihn dem Kunden sagen muss. Ein `boolean` haette
 * alle drei gezwungen, sich den Grund noch einmal selbst
 * auszurechnen, und drei Rechnungen laufen irgendwann auseinander.
 *
 * "nicht-gestartet" gilt als AKTIV. Wer noch nicht veroeffentlicht
 * hat, hat nichts verbraucht: Die sechs Monate beginnen erst mit dem
 * Online-Gang, und fuer die Vorbereitungszeit zahlt er nichts. Nur die
 * Start-Frist kann ihm dazwischenkommen, und die ist ein eigener Fall.
 */
export type SchaltungsStand =
  /** Monatliches Paket: laeuft, solange das Paket laeuft */
  | { aktiv: true; art: "mit-paket" }
  /** Gekauft, veroeffentlicht, laeuft noch */
  | { aktiv: true; art: "laeuft"; endet: Date }
  /** Gekauft, noch nicht veroeffentlicht */
  | { aktiv: true; art: "nicht-gestartet"; startBis: Date | null }
  /** Die sechs Monate sind vorbei */
  | { aktiv: false; art: "abgelaufen"; endete: Date }
  /** Nie gestartet, und die Start-Frist ist verstrichen */
  | { aktiv: false; art: "start-frist-verpasst"; frist: Date }
  /** Keine Buchung deckt die Schaltung ab */
  | { aktiv: false; art: "keine" };

export function schaltungsStand({
  befristet,
  veroeffentlichtAm,
  zusatzMonate = 0,
  gebuchtAm,
  jetzt = new Date(),
  fristAb = SCHALTUNG_START_FRIST_AB,
}: {
  /** Aus lib/entitlements.ts: "befristet" | "mit-paket" | "keine" */
  befristet: "befristet" | "mit-paket" | "keine";
  veroeffentlichtAm: Date | null;
  zusatzMonate?: number;
  /** Wann die deckende Buchung gekauft wurde, fuer die Start-Frist */
  gebuchtAm: Date | null;
  jetzt?: Date;
  fristAb?: string | null;
}): SchaltungsStand {
  if (befristet === "keine") return { aktiv: false, art: "keine" };
  if (befristet === "mit-paket") return { aktiv: true, art: "mit-paket" };

  if (!veroeffentlichtAm) {
    const frist = gebuchtAm ? startFristEnde(gebuchtAm, fristAb) : null;
    if (frist && jetzt >= frist) {
      return { aktiv: false, art: "start-frist-verpasst", frist };
    }
    return { aktiv: true, art: "nicht-gestartet", startBis: frist };
  }

  const ende = schaltungEnde(veroeffentlichtAm, zusatzMonate);
  return jetzt >= ende
    ? { aktiv: false, art: "abgelaufen", endete: ende }
    : { aktiv: true, art: "laeuft", endet: ende };
}

/** Ende der Mindestlaufzeit eines monatlichen Pakets */
export function mindestlaufzeitEnde(beginn: Date): Date {
  const ende = new Date(beginn);
  ende.setMonth(ende.getMonth() + PAKET_MINDESTLAUFZEIT_MONATE);
  return ende;
}

/** Datum als "12. Februar 2027", innen geschützt gegen Zeilenumbruch */
/**
 * Wie lange eine Laufzeit noch laeuft, in Worten.
 *
 * WOZU (Auflage des Inhabers, 30.08.2026): Vor dem Melden eines
 * Verkaufs soll dastehen, WIE VIELE bezahlte Monate damit enden, nicht
 * nur bis wann sie gelaufen waeren. "Bis zum 12. Februar 2027" laesst
 * den Kunden rechnen; "4 Monate und 2 Wochen" nicht.
 *
 * KEIN EURO-BETRAG, und das ist eine Entscheidung des Inhabers vom
 * selben Tag: Die sechs Monate Schaltung sind im Paket ENTHALTEN und
 * nicht einzeln bepreist. Die 89 Euro sind der Preis der
 * VERLAENGERUNG, also eines anderen Produkts. Eine Zahl, die sich
 * nicht verteidigen laesst, wird zur Forderung.
 *
 * GERECHNET WIRD IN GANZEN TAGEN, nicht in Millisekunden: Sonst haengt
 * das Ergebnis an der Uhrzeit des Aufrufs, und derselbe Tag ergaebe
 * morgens etwas anderes als abends.
 */
export function restlaufzeitText(bis: Date, ab: Date = new Date()): string | null {
  const einTag = 24 * 60 * 60 * 1000;
  const tage = Math.round(
    (Date.UTC(bis.getFullYear(), bis.getMonth(), bis.getDate()) -
      Date.UTC(ab.getFullYear(), ab.getMonth(), ab.getDate())) /
      einTag
  );
  /* NULL statt eines Satzes, wenn nichts mehr uebrig ist: Der Aufrufer
     laesst den Hinweis dann ganz weg, statt "keine Restlaufzeit mehr"
     in einen Satz zu setzen, der eine Restlaufzeit ankuendigt. */
  if (tage <= 0) return null;
  /* DIE REINE DAUER, ohne "noch" und ohne Verb. Die erste Fassung gab
     "noch 4 Monate" zurueck, und im Satz stand dann "das ist noch 4
     Monate" (gemessen am Bild vom 30.08.2026). Wer das Wort mitliefert,
     nimmt dem Aufrufer die Grammatik aus der Hand. */
  if (tage < 7) return tage === 1 ? "einen Tag" : `${tage} Tage`;
  const monate = Math.floor(tage / 30);
  const wochen = Math.floor((tage - monate * 30) / 7);
  if (monate === 0) return wochen === 1 ? "eine Woche" : `${wochen} Wochen`;
  const monatsText = monate === 1 ? "einen Monat" : `${monate} Monate`;
  if (wochen === 0) return monatsText;
  return `${monatsText} und ${wochen === 1 ? "eine Woche" : `${wochen} Wochen`}`;
}

export function datumLang(datum: Date): string {
  return formatDatum(datum);
}
