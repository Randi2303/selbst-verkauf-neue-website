/**
 * Besichtigungen mit Interessenten.
 *
 * ABGRENZUNG, die im ganzen Projekt gilt:
 *   termin_anfragen  Verkaeufer und Team, haengt an gebuchten Leistungen
 *   besichtigungen   Verkaeufer und Interessent, haengt am Objekt
 * Beide erscheinen in der Terminuebersicht des Verkaeufers, bleiben
 * dort aber unterscheidbar und filterbar.
 */

import { formatMenge, ohneUmbruch, zahlwort } from "@/lib/utils";

/**
 * Kombinierte Zeitangaben paarweise schuetzen (Bau-Runde 5): Genau die
 * Fugen, die nie brechen duerfen, werden fest ("24. August",
 * "August 2026", "13:14 Uhr"); alles andere, auch " um " und die
 * Kommas, bleibt brechbar. Ein ganzer geklebter Abschnitt war der
 * erste Wurf und riss bei 320 px im Notfall-Umbruch mitten im Paar,
 * weil er laenger war als die Zeile.
 */
function paareGeschuetzt(text: string): string {
  const MONAT =
    "Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember";
  return text
    .replace(new RegExp(`(\\d{1,2}\\.) (${MONAT})`, "g"), `$1${" "}$2`)
    .replace(new RegExp(`(${MONAT}) (\\d{4})`, "g"), `$1${" "}$2`)
    .replace(/(\d{1,2}:\d{2}) (Uhr)/g, `$1${" "}$2`);
}

export const BESICHTIGUNG_STATUS = [
  { id: "vorgeschlagen", label: "Vorgeschlagen" },
  { id: "bestaetigt", label: "Bestätigt" },
  { id: "abgesagt", label: "Abgesagt" },
  { id: "durchgefuehrt", label: "Stattgefunden" },
  { id: "verfallen", label: "Hinfällig" },
] as const;

export type BesichtigungStatus = (typeof BESICHTIGUNG_STATUS)[number]["id"];

export function besichtigungStatusLabel(id: string): string {
  return BESICHTIGUNG_STATUS.find((s) => s.id === id)?.label ?? id;
}

/**
 * Die drei Terminarten (Migration 0042). Die NAMEN sind bewusst so
 * gewaehlt, dass die mittlere und die letzte nicht verwechselbar sind:
 * "Zeitfenster" benennt den Mechanismus (jeder waehlt sein eigenes
 * Fenster, niemand begegnet sich), "Gruppentermin" benennt die Gruppe
 * (alle gleichzeitig). "Tag der offenen Tuer" wuerde Kommen ohne
 * Anmeldung versprechen, "Sammeltermin" gegen "Sammelbesichtigung"
 * waere nicht unterscheidbar. Alle drei Namen bleiben bei 320 px in
 * einer Zeile.
 */
export const BESICHTIGUNG_ARTEN = [
  {
    id: "einzeltermin",
    label: "Einzeltermin",
    satz: "Ein einzelner Termin für eine Person. Sie können ihr bis zu vier Zeitpunkte zur Auswahl anbieten.",
    /* kurz: Halbsatz hinter dem Artwort in der Terminzeile (Runde 27,
       Inhaber: ein Verkäufer ist kein Makler; wo der Name allein
       nicht trägt, steht ein Halbsatz dabei). "Einzeltermin" trägt
       allein. */
    kurz: null,
  },
  {
    id: "zeitfenster",
    label: "Zeitfenster",
    satz: "Mehrere Termine nacheinander: Sie geben einen Zeitraum frei, er wird in gleich lange Fenster geteilt. Jeder Interessent wählt sein eigenes Fenster, die Zeit gehört ihm allein.",
    kurz: "jeder besichtigt für sich",
  },
  {
    id: "gruppentermin",
    label: "Gruppentermin",
    satz: "Ein Termin für alle gleichzeitig: Mehrere Interessenten besichtigen zusammen, mit einer Obergrenze für die Teilnehmerzahl.",
    kurz: "alle gemeinsam",
  },
] as const;

/** Der Halbsatz hinter dem Artwort in einer Terminzeile, wo nötig */
export function besichtigungArtKurz(id: string): string | null {
  return BESICHTIGUNG_ARTEN.find((a) => a.id === id)?.kurz ?? null;
}

export type BesichtigungsArt = (typeof BESICHTIGUNG_ARTEN)[number]["id"];

export function besichtigungArtLabel(id: string): string {
  return BESICHTIGUNG_ARTEN.find((a) => a.id === id)?.label ?? "Besichtigung";
}

/** Hoechstzahl der Fenster einer Zeitfenster-Serie in einem Zug */
export const FENSTER_MAX = 16;

export type Besichtigung = {
  id: string;
  user_id: string;
  objekt_id: string;
  beginn: string;
  dauer_minuten: number;
  max_teilnehmer: number;
  status: string;
  adresse_frueh_freigeben: boolean;
  grund: string | null;
  verschoben_von: string | null;
  /** Zaehlt jede Verschiebung mit, siehe Kalenderdatei */
  folge: number;
  erstellt_am: string;
  erinnerung_gesendet_am: string | null;
  /** einzeltermin, zeitfenster oder gruppentermin (Migration 0042) */
  art: BesichtigungsArt;
  /** Gruppiert die Fenster einer Zeitfenster-Serie, sonst null */
  serie_id: string | null;
};

export const EINLADUNG_STATUS = [
  { id: "offen", label: "Wartet auf Antwort" },
  { id: "zugesagt", label: "Zugesagt" },
  { id: "abgesagt", label: "Abgesagt" },
  { id: "verfallen", label: "Hinfällig" },
  { id: "belegt", label: "Platz war vergeben" },
] as const;

export function einladungStatusLabel(id: string): string {
  return EINLADUNG_STATUS.find((s) => s.id === id)?.label ?? id;
}

export type Einladung = {
  id: string;
  besichtigung_id: string;
  interessent_id: string;
  user_id: string;
  status: string;
  rueckmeldung: string | null;
  gesendet_am: string;
  beantwortet_am: string | null;
};

/**
 * Die Ereignisse einer Besichtigung, beide Richtungen.
 *
 * WARUM ES DIESE LISTE GIBT: Der Zustand einer Einladung wird
 * ueberschrieben. Verschiebt der Verkaeufer einen bestaetigten Termin,
 * geht sie zurueck auf "offen", und die Zusage von vorher waere sonst
 * spurlos verschwunden. Die Chronik steht deshalb in einer eigenen
 * Tabelle (Migration 0032) und wird nie aus dem Zustand abgeleitet.
 */
export const BESICHTIGUNG_EREIGNISSE = [
  "vorgeschlagen",
  "verschoben",
  "abgesagt_verkaeufer",
  "durchgefuehrt",
  "zugesagt",
  "abgesagt",
  "belegt",
  "verfallen",
] as const;

export type BesichtigungEreignisArt = (typeof BESICHTIGUNG_EREIGNISSE)[number];

export type BesichtigungEreignis = {
  id: string;
  art: string;
  fuer_zeitpunkt: string;
  dauer_minuten: number;
  rueckmeldung: string | null;
  erstellt_am: string;
};

/**
 * Wie ein Ereignis im Verlauf der Akte heisst.
 *
 * OHNE ZEITANGABE, und das ist eine Festlegung fuer den ganzen Verlauf:
 * Die Ueberschrift sagt, WAS passiert ist, die Zeile darunter, WANN es
 * vermerkt wurde, und der Text, WORUM es ging. Vorher stand der Termin
 * bei manchen Eintraegen in der Ueberschrift und bei anderen darunter,
 * und die Liste las sich uneinheitlich.
 */
export function ereignisTitel(art: string): string {
  switch (art) {
    case "vorgeschlagen":
      return "Besichtigung vorgeschlagen";
    case "verschoben":
      return "Von Ihnen verschoben";
    case "abgesagt_verkaeufer":
      return "Von Ihnen abgesagt";
    case "durchgefuehrt":
      return "Besichtigung hat stattgefunden";
    case "zugesagt":
      return "Hat zugesagt";
    case "abgesagt":
      return "Hat abgesagt";
    case "belegt":
      return "Wollte teilnehmen, der Platz war vergeben";
    case "verfallen":
      return "Vorschlag wurde hinfällig";
    default:
      return "Besichtigung";
  }
}

/** Wie lange eine Besichtigung dauert, wenn nichts gewaehlt wurde */
export const DAUER_VORGABE = 30;

/** Angebotene Dauern. Mehr Auswahl hilft hier niemandem. */
export const DAUER_AUSWAHL = [20, 30, 45, 60, 90] as const;

/**
 * Nimmt der Termin noch eine Zusage an?
 *
 * Das ist die EINE Wahrheit dafuer, wie bei nimmtGeboteAn() im
 * Bieterverfahren. Ein blosser Blick auf den Status reicht nicht: Ein
 * Termin kann vorgeschlagen und trotzdem voll sein, und ein Termin in
 * der Vergangenheit nimmt nichts mehr an, auch wenn niemand ihn
 * abgesagt hat.
 */
export function nimmtZusagenAn(
  b: Pick<Besichtigung, "status" | "beginn" | "max_teilnehmer">,
  zusagen: number,
  jetzt: Date = new Date()
): { moeglich: boolean; grund?: "abgesagt" | "vorbei" | "voll" } {
  if (b.status === "abgesagt" || b.status === "verfallen") {
    return { moeglich: false, grund: "abgesagt" };
  }
  if (new Date(b.beginn).getTime() <= jetzt.getTime()) {
    return { moeglich: false, grund: "vorbei" };
  }
  if (zusagen >= b.max_teilnehmer) return { moeglich: false, grund: "voll" };
  return { moeglich: true };
}

/**
 * Was der Interessent vom Ort sieht.
 *
 * ADRESSE ERST NACH BESTAETIGUNG: Solange nur ein Vorschlag offen ist,
 * bekommt er Postleitzahl und Ort. Die Strasse erscheint erst mit der
 * Bestaetigung. Der Verkaeufer kann sie frueher freigeben, das ist
 * seine Entscheidung und keine Vorgabe von uns.
 */
export function ortFuerInteressent(
  objekt: { strasse: string | null; plz: string | null; stadt: string | null },
  b: Pick<Besichtigung, "status" | "adresse_frueh_freigeben">
): string {
  const grob = [objekt.plz, objekt.stadt].filter(Boolean).join(" ") || "Wird noch mitgeteilt";
  const genau = [objekt.strasse, grob].filter(Boolean).join(", ");
  const freigegeben = b.status === "bestaetigt" || b.adresse_frueh_freigeben;
  return freigegeben && objekt.strasse ? genau : grob;
}

/** Die vollstaendige Adresse, wie sie der Verkaeufer selbst sieht */
export function ortFuerVerkaeufer(objekt: {
  strasse: string | null;
  plz: string | null;
  stadt: string | null;
}): string {
  return (
    [objekt.strasse, [objekt.plz, objekt.stadt].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ") || "Bei Ihrer Immobilie"
  );
}

const ZEIT = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Montag, 10. August 2026, 14:00 Uhr, 45 Minuten" */
export function zeitraumText(beginn: string, dauer: number): string {
  return `${paareGeschuetzt(`${ZEIT.format(new Date(beginn))} Uhr`)}, ${formatMenge(dauer, "Minuten")}`;
}

/** Freie Plaetze, fuer die Anzeige beim Interessenten */
export function freiePlaetze(b: Pick<Besichtigung, "max_teilnehmer">, zusagen: number): number {
  return Math.max(0, b.max_teilnehmer - zusagen);
}

/** Kurze Zeitangabe fuer Listen: "Mo, 10.08., 14:00" */
const KURZ = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function zeitKurz(beginn: string): string {
  return paareGeschuetzt(`${KURZ.format(new Date(beginn))} Uhr`);
}

/**
 * Ein Termin, zu dem JETZT noch eingeladen werden kann, so wie ihn
 * /api/besichtigungen/offen liefert.
 *
 * DER TYP LIEGT HIER UND NICHT IN DER ROUTE. Ein Client-Baustein, der
 * seinen Typ aus einer Route-Datei zieht, haengt am Servermodul und
 * damit an allem, was dieses importiert. Das ist keine theoretische
 * Sorge: Genau diese Kopplung liess den Planen-Kasten sich nicht mehr
 * oeffnen (gefunden im Durchspielen am 13.08.2026).
 */
export type OffenerTermin = {
  id: string;
  beginn: string;
  dauer_minuten: number;
  max_teilnehmer: number;
  art: BesichtigungsArt;
  serie_id: string | null;
  eingeladen: number;
  zugesagt: number;
  /** Wer von den gerade gewaehlten Personen hier schon eingeladen ist */
  schon: string[];
};

/** Tag und Uhrzeit fuer die Auswahl: "Samstag, 16. August, 10 bis 12 Uhr" */
const TAG = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const UHR = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

export function tagUndZeit(beginn: string, dauer: number): string {
  const start = new Date(beginn);
  const ende = new Date(start.getTime() + dauer * 60_000);
  return paareGeschuetzt(
    `${TAG.format(start)}, ${UHR.format(start)} bis ${UHR.format(ende)} Uhr`
  );
}

/* Kleine Zahlen als Wort: seit dem 21.08.2026 in lib/utils.ts, bei
   den anderen Sprachformern. Hier nur noch weitergereicht, damit die
   bestehenden Aufrufer unveraendert bleiben. */
export { zahlwort };

/**
 * Der Platzstand eines Termins in EINEM Satz, mit ALLEN DREI ZAHLEN:
 * wie viele eingeladen sind, wie viele zugesagt haben und wie viele
 * Plaetze noch frei sind.
 *
 * "Fünf Personen eingeladen, drei zugesagt, fünf von acht Plätzen frei"
 *
 * WARUM ALLE DREI: Wer nur die Zusagen sieht, haelt einen Termin mit
 * acht Eingeladenen und null Zusagen fuer leer und laedt acht weitere
 * dazu. Wer nur die freien Plaetze sieht, weiss nicht, wie viele
 * Antworten noch unterwegs sind.
 */
export function platzstand(b: {
  max_teilnehmer: number;
  eingeladen: number;
  zugesagt: number;
}): string {
  if (b.eingeladen === 0) return "Noch niemand eingeladen";
  const frei = freiePlaetze(b, b.zugesagt);
  const teile = [
    `${zahlwort(b.eingeladen)} ${b.eingeladen === 1 ? "Person" : "Personen"} eingeladen`,
    b.zugesagt === 0 ? "noch keine Zusage" : `${zahlwort(b.zugesagt)} zugesagt`,
    b.max_teilnehmer === 1
      ? frei === 0
        ? "der Platz ist vergeben"
        : "der Platz ist frei"
      : frei === 0
        ? "kein Platz mehr frei"
        : /* "eine von vier Plätzen" waere falsch, der Platz ist
             maennlich. Bei genau einem deshalb ein eigener Satzteil
             (gefunden im Durchspielen am 13.08.2026). */
          frei === 1
          ? `noch ein Platz von ${zahlwort(b.max_teilnehmer)} frei`
          : `${zahlwort(frei)} von ${zahlwort(b.max_teilnehmer)} Plätzen frei`,
  ];
  const satz = teile.join(", ");
  return satz.charAt(0).toUpperCase() + satz.slice(1);
}

/**
 * Wie lange vorher die Erinnerung rausgeht.
 *
 * 24 Stunden, also der Vortag. Der Auftrag sagt "am Vortag", und das
 * ist auch die Spanne, in der jemand noch umplanen oder absagen kann.
 * Eine Erinnerung am selben Morgen kaeme fuer eine Absage zu spaet.
 */
export const ERINNERUNG_STUNDEN_VORHER = 24;

/**
 * Steht dieser Termin im Erinnerungsfenster?
 *
 * Bewusst eine Spanne und kein Zeitpunkt: Der Auftrag laeuft nicht auf
 * die Minute genau, sondern ein paar Mal am Tag. Geprueft wird deshalb
 * "der Termin beginnt innerhalb der naechsten 24 Stunden und liegt noch
 * vor uns".
 *
 * DASS EINE ERINNERUNG NICHT ZWEIMAL RAUSGEHT, sichert seit 0059
 * besichtigungs_einladungen.erinnerung_gesendet_am, also die Markierung
 * JE PERSON. Frueher stand sie am Termin, und das war falsch, sobald
 * jemand nachtraeglich dazukam: Der Termin galt als erinnert, die neu
 * eingeladene Person bekam nie eine Erinnerung.
 */
export function erinnerungFaellig(
  b: Pick<Besichtigung, "status" | "beginn">,
  jetzt: Date = new Date()
): boolean {
  if (b.status !== "bestaetigt") return false;
  const beginn = new Date(b.beginn).getTime();
  if (beginn <= jetzt.getTime()) return false;
  return beginn - jetzt.getTime() <= ERINNERUNG_STUNDEN_VORHER * 60 * 60 * 1000;
}

/**
 * Ein Termin ist eine Sammelbesichtigung, sobald mehr als ein Platz
 * darauf liegt. Der Unterschied ist nicht nur kosmetisch: Bei einer
 * Sammelbesichtigung erfaehrt der Interessent, dass andere dabei sind,
 * und der Platz kann vergeben sein, bevor er antwortet.
 */
export function istSammel(b: Pick<Besichtigung, "max_teilnehmer">): boolean {
  return b.max_teilnehmer > 1;
}

/**
 * Die Vorschlaege einer Runde, die durch eine Zusage hinfaellig werden.
 *
 * WARUM DAS NOETIG IST: Ein Verkaeufer schlaegt derselben Person drei
 * Zeiten vor. Sagt sie fuer die zweite zu, sind die anderen beiden
 * erledigt, sonst stuenden drei Termine mit einer Person im Kalender.
 * Bei einer Sammelbesichtigung gilt das NICHT: Dort ist jeder Termin
 * ein eigener Termin mit eigenen Gaesten.
 *
 * Erkannt wird eine Runde daran, dass dieselbe Person zu mehreren
 * Einzelterminen desselben Objekts eingeladen ist und noch nicht
 * geantwortet hat.
 */
export function hinfaelligDurchZusage(
  zugesagt: { besichtigung_id: string },
  offeneEinladungen: { id: string; besichtigung_id: string; status: string }[]
): string[] {
  return offeneEinladungen
    .filter((e) => e.status === "offen" && e.besichtigung_id !== zugesagt.besichtigung_id)
    .map((e) => e.id);
}
