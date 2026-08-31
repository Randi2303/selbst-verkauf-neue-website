/** Kleine Helfer, die überall gebraucht werden. */

/** Klassenlisten zusammenfügen, falsy Werte fallen raus */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Ganze Zahl im deutschen Format, z. B. 485000 zu "485.000" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value);
}

/** Euro-Betrag mit geschütztem Leerzeichen vor dem Zeichen */
export function formatEuro(value: number): string {
  return `${formatNumber(value)} €`;
}

/*
 * ZUSAMMENGEHÖRIGE PAARE BRECHEN NIE UM (Bau-Runde 5, 17.08.2026).
 *
 * Das geschützte Leerzeichen (U+00A0) gab es bis dahin nur für
 * Beträge (formatEuro oben, lib/preise.ts). Gemessen war die Folge:
 * kein einziger Betrag umgebrochen, fünfzehn Stellen mit Datum,
 * Uhrzeit, Zahl mit Einheit oder Abkürzung schon. "Stand 10. August
 * 2026" trennte nach "10.", "22:21 Uhr" vor "Uhr".
 *
 * Deshalb stehen die Former hier, direkt neben formatEuro: Wer die
 * nächste Datumsangabe schreibt, ruft formatDatum() und muss an das
 * unsichtbare Zeichen nicht denken. Ein direkter toLocaleDateString-
 * Aufruf umgeht das weiterhin; dagegen steht die Messung
 * (.pruefung/umbruch-messung.mjs), kein Zwang.
 *
 * Die Zeitzone ist FEST Europe/Berlin: Auf einem Server, der in UTC
 * läuft, wäre "23:30 Uhr" sonst der falsche Tag, und die Anzeige
 * hinge davon ab, wo der Prozess gerade rechnet.
 */

/** Die Fuge, die nie umbrechen darf */
const GESCHUETZT = " ";

/**
 * Einen Textbaustein am Stück halten: jedes Leerzeichen darin wird
 * geschützt. Für feste Angaben wie "10. August 2026" in Konfiguration
 * und für mehrteilige Abkürzungen wie "z. B." mitten im Satz.
 */
export function ohneUmbruch(text: string): string {
  return text.replace(/ /g, GESCHUETZT);
}

const DATUM_LANG = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const WOCHENTAG = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "long",
});

/**
 * Datum als "10. August 2026", innen geschützt. Mit wochentag kommt
 * "Montag, 10. August 2026"; nach dem Komma darf die Zeile brechen,
 * das ist eine natürliche Fuge und kein zerrissenes Paar.
 */
export function formatDatum(
  wert: Date | string | number,
  optionen?: { wochentag?: boolean }
): string {
  const datum = new Date(wert);
  const kern = ohneUmbruch(DATUM_LANG.format(datum));
  return optionen?.wochentag ? `${WOCHENTAG.format(datum)}, ${kern}` : kern;
}

const NUR_TAG_MONAT = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "numeric",
  month: "long",
});

/** Datum ohne Jahr als "13. August", innen geschützt */
export function formatDatumOhneJahr(wert: Date | string | number): string {
  return ohneUmbruch(NUR_TAG_MONAT.format(new Date(wert)));
}

const UHRZEIT = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});

/** Uhrzeit als "10:30 Uhr", das Wort Uhr hängt fest an der Zahl */
export function formatUhrzeit(wert: Date | string | number): string {
  return `${UHRZEIT.format(new Date(wert))}${GESCHUETZT}Uhr`;
}

const DATUM_NUMERISCH = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATUM_NUMERISCH_WOCHENTAG = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Zeitpunkt als "13.08.2026, 22:21 Uhr", mit wochentag als
 * "Mo., 13.08.2026, 22:21 Uhr". Das numerische Datum hat keine
 * brechbare Fuge, die Uhrzeit hängt fest an ihrem "Uhr".
 */
export function formatDatumZeit(
  wert: Date | string | number,
  optionen?: { wochentag?: boolean }
): string {
  const datum = new Date(wert);
  const tag = (optionen?.wochentag ? DATUM_NUMERISCH_WOCHENTAG : DATUM_NUMERISCH).format(datum);
  return `${tag}, ${formatUhrzeit(datum)}`;
}

/**
 * Zahl mit Einheit als "132 m²" oder "6 Monate", die Einheit hängt
 * fest an der Zahl. Zahlen kommen im deutschen Format, Nachkommastellen
 * bleiben stehen (anders als formatNumber, das rundet).
 */
export function formatMenge(wert: number | string, einheit: string): string {
  const zahl =
    typeof wert === "number"
      ? new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(wert)
      : wert;
  return `${zahl}${GESCHUETZT}${ohneUmbruch(einheit)}`;
}

/** Auf einen Rasterwert runden, z. B. für die Marktwert-Spanne */
export function roundTo(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Telefonnummer aus der Anzeigeform in einen tel:-Link umwandeln */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}

/* ------------------------------------------------------------------ */
/* Kleine Zahlen als Wort                                              */
/* ------------------------------------------------------------------ */

const ZAHLWORTE = [
  "null",
  "ein",
  "zwei",
  "drei",
  "vier",
  "fünf",
  "sechs",
  "sieben",
  "acht",
  "neun",
  "zehn",
  "elf",
  "zwölf",
];

/**
 * Kleine Zahlen als Wort, ab dreizehn als Ziffer.
 *
 * WARUM (Regel des Inhabers, 21.08.2026, und die Begründung stand
 * schon in lib/besichtigungen.ts): In einem Satz wie "drei von acht
 * Plätzen zugesagt" liest sich die Ziffer wie eine Kennzahl aus einem
 * Auswertungswerkzeug; ab dreizehn kippt es andersherum. AM
 * SATZANFANG gilt es doppelt: "1 Anfrage wartet auf Ihre Antwort"
 * beginnt einen Satz mit einer Ziffer, und das tut kein deutscher
 * Satz.
 *
 * DIE FORM MUSS DAZU, weil die Eins sich beugt: eine Anfrage, ein
 * Nachweis. Ab zwei ist es gleichgültig, deshalb wirkt der Zusatz nur
 * bei der Eins.
 *
 * HIER UND NICHT IN lib/besichtigungen.ts: Das ist ein Sprachformer
 * wie die Umbruch-Regeln darüber, und er wird inzwischen an drei
 * Stellen gebraucht.
 */
export function zahlwort(n: number, form: "ein" | "eine" = "eine"): string {
  if (n === 1) return form;
  return ZAHLWORTE[n] ?? String(n);
}

/**
 * Dasselbe, aber am Satzanfang: Das Wort beginnt groß.
 *
 * Getrennte Funktion und kein Schalter, weil man am Aufrufort sehen
 * soll, ob ein Satz beginnt.
 */
export function zahlwortGross(n: number, form: "ein" | "eine" = "eine"): string {
  const w = zahlwort(n, form);
  return w.charAt(0).toUpperCase() + w.slice(1);
}
