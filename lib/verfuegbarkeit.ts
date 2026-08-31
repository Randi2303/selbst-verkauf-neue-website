/**
 * DIE FREIEN ZEITEN, GERECHNET.
 *
 * Reine Funktionen, ohne Datenbank und ohne Netz. Genau deshalb lässt
 * sich der heikelste Teil dieses Vorhabens prüfen, ohne etwas
 * aufzusetzen: npm run verfuegbarkeit.
 *
 * WAS HIER ENTSCHEIDET, was ein Interessent zu sehen bekommt:
 *
 *   Regeln      "dienstags 17 bis 19", gilt immer wieder
 *   Zusatzzeit  "am 14. März auch 10 bis 12", gilt einmal
 *   Sperre      "1. bis 14. Juli gar nicht", sticht beides
 *   Belegt      was schon vergeben ist, mitsamt Puffer
 *   Vorlauf     wie kurzfristig noch gebucht werden darf
 *   Horizont    wie weit im Voraus
 *
 * DIE ZEITZONE IST HIER KEIN DETAIL. Der Verkäufer denkt in "17 Uhr",
 * die Datenbank speichert einen Zeitpunkt, und der Server läuft
 * womöglich in UTC. Ohne saubere Umrechnung stünde im Sommer 19 Uhr
 * dort, wo 17 gemeint war, und niemand würde es merken, bis jemand vor
 * verschlossener Tür steht. Deshalb wird jede Uhrzeit ausdrücklich in
 * Europe/Berlin gelesen, siehe zonenZeitpunkt().
 *
 * KEIN KALENDER ZUM BLÄTTERN. Herausfällt eine schlichte Liste von
 * Tagen mit ihren freien Zeiten. Wer sich einen Termin aussucht, will
 * nicht navigieren.
 */

export const ZEITZONE = "Europe/Berlin";

/** Eine wiederkehrende Zeit, 0 ist Sonntag wie in JavaScript */
export type Regel = { wochentag: number; von_zeit: string; bis_zeit: string };
/** Eine einzelne Zusatzzeit an einem bestimmten Tag */
export type Zusatzzeit = { datum: string; von_zeit: string; bis_zeit: string };
/** Ein gesperrter Zeitraum, beide Tage einschließlich */
export type Sperre = { von_datum: string; bis_datum: string };
/** Was schon vergeben ist */
export type Belegung = { beginn: string; dauer_minuten: number };

export type Einstellungen = {
  dauerMinuten: number;
  pufferMinuten: number;
  vorlaufStunden: number;
  horizontTage: number;
};

/** Ein anbietbarer Zeitpunkt */
export type Zeitpunkt = { beginn: Date; ende: Date };

/** Ein Tag mit seinen freien Zeiten, für die Anzeige */
export type FreierTag = {
  /** ISO-Datum in der Zeitzone, etwa "2026-08-20" */
  datum: string;
  zeiten: Zeitpunkt[];
};

/* ------------------------------------------------------------------ */
/* Zeitzone                                                           */
/* ------------------------------------------------------------------ */

/**
 * Um wie viele Millisekunden die Zone zu diesem Zeitpunkt von UTC
 * abweicht. Positiv östlich von Greenwich.
 */
function zonenVersatz(zeitpunkt: Date, zone: string): number {
  const teile = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(zeitpunkt)
      .map((t) => [t.type, t.value])
  ) as Record<string, string>;
  const alsUtc = Date.UTC(
    Number(teile.year),
    Number(teile.month) - 1,
    Number(teile.day),
    Number(teile.hour) % 24,
    Number(teile.minute),
    Number(teile.second)
  );
  return alsUtc - zeitpunkt.getTime();
}

/**
 * Aus "2026-08-20" und "17:00" den echten Zeitpunkt machen, gelesen
 * als Ortszeit in der Zone.
 *
 * ZWEIMAL GERECHNET, und das ist kein Versehen: Der Versatz hängt vom
 * Zeitpunkt ab, den wir gerade erst suchen. Der erste Durchgang
 * schätzt ihn aus der falschen Annahme, der zweite prüft ihn am
 * Ergebnis. Nur so stimmt auch die Nacht der Zeitumstellung.
 */
export function zonenZeitpunkt(datum: string, zeit: string, zone = ZEITZONE): Date {
  const hhmm = zeit.slice(0, 5);
  const roh = new Date(`${datum}T${hhmm}:00Z`);
  const erst = new Date(roh.getTime() - zonenVersatz(roh, zone));
  return new Date(roh.getTime() - zonenVersatz(erst, zone));
}

/** Das ISO-Datum eines Zeitpunkts in der Zone, etwa "2026-08-20" */
export function zonenDatum(zeitpunkt: Date, zone = ZEITZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(zeitpunkt);
}

/**
 * Der Wochentag eines Kalenderdatums, 0 ist Sonntag.
 *
 * OHNE ZEITZONE, weil ein Kalenderdatum keine hat: Der 20. August 2026
 * ist ueberall ein Donnerstag. Gerechnet wird mittags in UTC, damit
 * keine Umstellung den Tag kippen kann.
 */
export function zonenWochentag(datum: string): number {
  return new Date(`${datum}T12:00:00Z`).getUTCDay();
}

/** Ein Datum um Tage weiterschieben, rein auf der Kalenderebene */
function tagPlus(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Fenster                                                            */
/* ------------------------------------------------------------------ */

type Fenster = { von: Date; bis: Date };

/**
 * Überlappende oder aneinandergrenzende Fenster zusammenlegen.
 *
 * Zwei Fenster am selben Tag, die sich überschneiden, sind kein
 * Fehler, sondern eine unnötige Eingabe. Sie hier zusammenzulegen ist
 * freundlicher, als sie beim Speichern abzulehnen.
 */
function fensterZusammenlegen(fenster: Fenster[]): Fenster[] {
  const sortiert = [...fenster].sort((a, b) => a.von.getTime() - b.von.getTime());
  const raus: Fenster[] = [];
  for (const f of sortiert) {
    const letztes = raus[raus.length - 1];
    if (letztes && f.von.getTime() <= letztes.bis.getTime()) {
      if (f.bis.getTime() > letztes.bis.getTime()) letztes.bis = f.bis;
    } else {
      raus.push({ von: new Date(f.von), bis: new Date(f.bis) });
    }
  }
  return raus;
}

/** Liegt dieser Tag in einer Sperre? */
function gesperrt(datum: string, sperren: Sperre[]): boolean {
  return sperren.some((s) => datum >= s.von_datum && datum <= s.bis_datum);
}

/* ------------------------------------------------------------------ */
/* Die Rechnung                                                       */
/* ------------------------------------------------------------------ */

/**
 * Die freien Zeiten der nächsten Wochen.
 *
 * DER PUFFER GILT IN BEIDE RICHTUNGEN. Wer um 17 Uhr jemanden hat,
 * will nicht um 17:45 den nächsten an der Tür haben, während der erste
 * noch im Keller steht. Deshalb wird ein bereits vergebener Termin für
 * die Rechnung um den Puffer nach vorn UND nach hinten verbreitert.
 *
 * BELEGT IST BELEGT, gleich wie der Termin entstanden ist. Ein von
 * Hand vergebener Einzeltermin blockiert genauso wie ein selbst
 * gebuchter; sonst stünden zwei Menschen gleichzeitig vor der Tür.
 */
export function freieZeiten(
  eingabe: {
    regeln: Regel[];
    zusatzzeiten: Zusatzzeit[];
    sperren: Sperre[];
    belegt: Belegung[];
    einstellungen: Einstellungen;
    /** Für die Prüfung fest vorgebbar */
    jetzt?: Date;
    zone?: string;
  }
): FreierTag[] {
  const zone = eingabe.zone ?? ZEITZONE;
  const jetzt = eingabe.jetzt ?? new Date();
  const { dauerMinuten, pufferMinuten, vorlaufStunden, horizontTage } =
    eingabe.einstellungen;

  const frueheste = new Date(jetzt.getTime() + vorlaufStunden * 60 * 60 * 1000);
  const heute = zonenDatum(jetzt, zone);

  /* Belegte Zeiten einmal aufbereiten: Anfang und Ende, jeweils um den
     Puffer verbreitert. Danach ist der Vergleich ein schlichter
     Überschneidungs-Test. */
  const gesperrteZeiten = eingabe.belegt.map((b) => {
    const beginn = new Date(b.beginn);
    return {
      von: new Date(beginn.getTime() - pufferMinuten * 60 * 1000),
      bis: new Date(
        beginn.getTime() + (b.dauer_minuten + pufferMinuten) * 60 * 1000
      ),
    };
  });

  const tage: FreierTag[] = [];

  for (let i = 0; i <= horizontTage; i++) {
    const datum = tagPlus(heute, i);
    if (gesperrt(datum, eingabe.sperren)) continue;

    const wochentag = zonenWochentag(datum);
    const fenster: Fenster[] = [
      ...eingabe.regeln
        .filter((r) => r.wochentag === wochentag)
        .map((r) => ({
          von: zonenZeitpunkt(datum, r.von_zeit, zone),
          bis: zonenZeitpunkt(datum, r.bis_zeit, zone),
        })),
      ...eingabe.zusatzzeiten
        .filter((z) => z.datum === datum)
        .map((z) => ({
          von: zonenZeitpunkt(datum, z.von_zeit, zone),
          bis: zonenZeitpunkt(datum, z.bis_zeit, zone),
        })),
    ];
    if (fenster.length === 0) continue;

    const zeiten: Zeitpunkt[] = [];
    for (const f of fensterZusammenlegen(fenster)) {
      /* Der Schritt ist Dauer PLUS Puffer: Zwei angebotene Zeiten
         direkt hintereinander waeren fuer den Verkaeufer dasselbe
         Problem wie zwei zu dicht vergebene. */
      const schritt = (dauerMinuten + pufferMinuten) * 60 * 1000;
      const dauer = dauerMinuten * 60 * 1000;
      for (let t = f.von.getTime(); t + dauer <= f.bis.getTime(); t += schritt) {
        const beginn = new Date(t);
        const ende = new Date(t + dauer);
        if (beginn < frueheste) continue;
        const kollidiert = gesperrteZeiten.some(
          (g) => beginn < g.bis && ende > g.von
        );
        if (kollidiert) continue;
        zeiten.push({ beginn, ende });
      }
    }

    if (zeiten.length > 0) tage.push({ datum, zeiten });
  }

  return tage;
}

export type Buchbarkeit =
  | { buchbar: true }
  | {
      /**
       * Warum nicht (Bau-Runde 5). Vorher kam ein blankes false, und
       * der Aufrufer nannte JEDEN Fall "gerade vergeben worden", auch
       * eine Zeit, die längst vorbei war.
       *
       * vorbei: Der Zeitpunkt liegt in der Vergangenheit.
       * belegt: Er stünde im Raster, ist aber vergeben oder gesperrt.
       * raster: Er wird (inzwischen) gar nicht mehr angeboten, etwa
       *   nach geänderten Zeiten oder unterhalb des Vorlaufs.
       */
      buchbar: false;
      grund: "vorbei" | "belegt" | "raster";
    };

/**
 * Ist genau dieser Zeitpunkt buchbar, und wenn nicht, warum nicht?
 *
 * DIESELBE RECHNUNG WIE FÜR DIE ANZEIGE, mit Absicht. Der Server
 * prüft beim Buchen nicht "irgendwie ähnlich", sondern stellt dieselbe
 * Frage noch einmal. Ein zweiter, eigener Prüfweg wäre eine zweite
 * Wahrheit, und die eine davon wäre irgendwann falsch.
 *
 * Der Grund kommt aus derselben Rechnung: Steht die Zeit in der Liste
 * OHNE Sperren und Belegung, aber nicht in der vollen Liste, war sie
 * angeboten und ist vergeben. Steht sie auch dort nicht, war sie nie
 * oder ist nicht mehr im Angebot.
 */
export function istBuchbar(
  beginn: Date,
  eingabe: Parameters<typeof freieZeiten>[0]
): Buchbarkeit {
  const ziel = beginn.getTime();
  if (ziel <= Date.now()) return { buchbar: false, grund: "vorbei" };
  const enthalten = (tage: FreierTag[]) =>
    tage.some((tag) => tag.zeiten.some((z) => z.beginn.getTime() === ziel));
  if (enthalten(freieZeiten(eingabe))) return { buchbar: true };
  const ohneBelegung = enthalten(
    freieZeiten({ ...eingabe, sperren: [], belegt: [] })
  );
  return { buchbar: false, grund: ohneBelegung ? "belegt" : "raster" };
}

/** Wie viele Zeiten insgesamt frei sind */
export function anzahlFrei(tage: FreierTag[]): number {
  return tage.reduce((summe, t) => summe + t.zeiten.length, 0);
}
