/**
 * Bonitaets- und Finanzierungsnachweis, in zwei Stufen.
 *
 * NUR SERVER-SEITIG.
 *
 * STUFE EINS (aktiv): Der Interessent laedt selbst einen Nachweis
 * hoch, entweder einen SCHUFA-BonitaetsCheck oder eine
 * Finanzierungsbestaetigung seiner Bank. Beide sind gleichwertig; die
 * Finanzierungsbestaetigung ist beim Kauf sogar aussagekraeftiger,
 * weil sie sich auf einen konkreten Betrag bezieht. Das funktioniert
 * ohne Vertrag mit irgendjemandem und ohne dass wir personenbezogene
 * Daten an Dritte geben.
 *
 * STUFE ZWEI (vorbereitet, inaktiv): eine Abfrage bei einer
 * Auskunftei. Die Schnittstelle unten ist anbieterunabhaengig
 * geschnitten. Wir wissen noch nicht, ob es die SCHUFA direkt wird
 * oder ein Dienstleister wie creditPass, CRIF oder Boniversum. Ein
 * Anbieterwechsel darf nur diesen Adapter betreffen, nie die
 * Oberflaeche. Deshalb gibt es genau EINE Funktion nach aussen:
 * pruefeBonitaet().
 *
 * Selbst-aktivierend: Ohne Zugangsdaten passiert nichts, die
 * Oberflaeche zeigt unveraendert Stufe eins.
 */

/* Name jetzt aus config/speicher-faecher.mjs, siehe dort */
export { BONITAET_BUCKET } from "@/config/speicher-faecher.mjs";

/* Die Woerter des Nachweis-Stands liegen client-lesbar in der config,
   weil auch das Schaufenster auf der Startseite sie zeigt; Einzelheiten
   dort */
import { NACHWEIS_WORTE } from "@/config/nachweis-woerter";

/**
 * Loeschfrist der hochgeladenen Nachweise in Tagen.
 *
 * 90 Tage ab Upload. Begruendung: Der Nachweis erfuellt seinen Zweck
 * nur fuer diesen einen Verkauf. 90 Tage decken die uebliche Spanne
 * von der ersten Anfrage bis zum Notartermin ab und lassen dem
 * Verkaeufer Luft, auf einen zweiten Interessenten zurueckzugehen.
 * Laenger waere nicht mehr erforderlich (Datenminimierung,
 * Art. 5 Abs. 1 lit. e DSGVO). Derselbe Wert steht in der Migration
 * 0023 als Vorgabewert der Spalte loeschen_ab.
 */
export const NACHWEIS_LOESCHFRIST_TAGE = 90;

/** Was hochgeladen werden darf, absichtlich eng */
export const ERLAUBTE_DATEITYPEN = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_DATEI_BYTES = 10 * 1024 * 1024;

export type NachweisArt = "schufa" | "finanzierungsbestaetigung";

export const NACHWEIS_ARTEN: { id: NachweisArt; label: string; hinweis: string }[] = [
  {
    id: "finanzierungsbestaetigung",
    label: "Finanzierungsbestätigung Ihrer Bank",
    hinweis:
      "Die Bestätigung Ihrer Bank über die zugesagte Finanzierungssumme. Für einen Immobilienkauf ist sie die aussagekräftigste Unterlage.",
  },
  {
    id: "schufa",
    label: "SCHUFA-BonitätsCheck",
    hinweis:
      "Die Auskunft, die Sie selbst bei der SCHUFA anfordern können und die für die Weitergabe gedacht ist.",
  },
];

/* ================================================================== */
/* Zustand eines Nachweises                                            */
/* ================================================================== */

/**
 * Ein hochgeladener Nachweis durchlaeuft zwei Stufen.
 *
 * "eingegangen" heisst: Es liegt eine Datei vor, mehr nicht. Sie kann
 * leer, veraltet oder die falsche sein. Niemand hat hineingesehen.
 *
 * "bestaetigt" heisst: Jemand HAT hineingesehen und festgestellt, dass
 * eine passende und lesbare Unterlage der angegebenen Art vorliegt.
 *
 * WAS "BESTAETIGT" AUSDRUECKLICH NICHT HEISST: dass wir den Inhalt
 * fachlich bewertet haetten. Wir pruefen nicht, ob eine Bank wirklich
 * zugesagt hat, ob die Summe reicht oder ob eine Auskunft aktuell ist.
 * Das koennten wir nicht, und wir behaupten es nirgends. Jeder Text in
 * der Oberflaeche muss auf dieser Linie bleiben.
 */
export type NachweisStatus = "eingegangen" | "bestaetigt" | "unbrauchbar";

export type Nachweis = {
  id: string;
  anfrage_id: string;
  art: NachweisArt;
  status: NachweisStatus;
  hochgeladen_am: string;
  geprueft_am: string | null;
  geprueft_rolle: "verkaeufer" | "team" | null;
  unbrauchbar_grund: string | null;
};

/**
 * Wie ein Nachweis benannt wird, je nach Art und Zustand.
 *
 * Die frueher benutzte Sammelbezeichnung "Bonitaet nachgewiesen" war in
 * beide Richtungen falsch: Eine Finanzierungsbestaetigung sagt, dass
 * eine Bank eine Summe zugesagt hat, ein SCHUFA-BonitaetsCheck sagt
 * etwas ganz anderes. Und "nachgewiesen" stand da, bevor jemand
 * hineingesehen hatte.
 */
export function nachweisBezeichnung(n: {
  art: NachweisArt;
  status: NachweisStatus;
}): string {
  if (n.status === "unbrauchbar") return NACHWEIS_WORTE.unbrauchbar;
  if (n.status === "eingegangen") return NACHWEIS_WORTE.eingegangen;
  return n.art === "finanzierungsbestaetigung"
    ? NACHWEIS_WORTE.finanzierungBestaetigt
    : NACHWEIS_WORTE.schufaLiegtVor;
}

/** Kurzform der Art, fuer Listen und Zeilen */
export const NACHWEIS_ART_KURZ: Record<NachweisArt, string> = {
  finanzierungsbestaetigung: "Finanzierungsbestätigung",
  schufa: "SCHUFA-BonitätsCheck",
};

/**
 * Zaehlt fuer das Bieterverfahren: Ein Gebot braucht mindestens einen
 * Nachweis, der nicht als unbrauchbar markiert ist. Ob er schon
 * bestaetigt wurde, entscheidet der Verkaeufer spaeter selbst; ein
 * ungeprueftes Gebot abzulehnen waere seine Sache, nicht unsere.
 */
export function zaehltAlsNachweis(n: { status: NachweisStatus }): boolean {
  return n.status !== "unbrauchbar";
}

/* ================================================================== */
/* Stufe zwei: Abfrage bei einer Auskunftei                            */
/* ================================================================== */

/**
 * Einstellung aus den Server-Variablen. Ohne BONITAET_API_URL und
 * BONITAET_API_KEY bleibt die Abfrage komplett aus.
 *
 * BONITAET_MOCK=true laesst die Abfrage ohne Vertrag durchlaufen und
 * liefert ein erkennbar erfundenes Ergebnis. Die Oberflaeche
 * kennzeichnet das deutlich, damit im Testbetrieb niemand ein
 * Mock-Ergebnis fuer echt haelt.
 */
export function bonitaetAbfrageAktiv(): boolean {
  return (
    process.env.BONITAET_MOCK === "true" ||
    Boolean(process.env.BONITAET_API_URL && process.env.BONITAET_API_KEY)
  );
}

export function bonitaetImMock(): boolean {
  return process.env.BONITAET_MOCK === "true";
}

/**
 * Hoechstens so viele Abfragen am Tag, ueber alle Admins zusammen.
 * Jede Abfrage kostet Geld und beruehrt Persoenlichkeitsrechte, ein
 * Versehen in einer Schleife darf nicht teuer werden.
 */
export const ABFRAGEN_JE_TAG = 25;

/** Was eine Auskunftei sinnvollerweise liefern kann, anbieterneutral */
export type BonitaetsErgebnis = {
  /** Erkennbar erfunden? Steuert die Kennzeichnung in der Oberflaeche */
  mock: boolean;
  /**
   * Sachliche Einordnung, KEINE Empfehlung. Wir bewerten niemanden,
   * wir stellen eine Information bereit.
   * "ohne_eintrag": keine Negativmerkmale bekannt
   * "eintrag": mindestens ein Negativmerkmal bekannt
   * "keine_auskunft": die Auskunftei konnte nichts sagen
   */
  befund: "ohne_eintrag" | "eintrag" | "keine_auskunft";
  /** Roher Anbieter-Text, falls vorhanden, unveraendert */
  hinweis: string | null;
  abgefragt_am: string;
  anbieter: string;
};

export type BonitaetsAnfrage = {
  vorname: string;
  nachname: string;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  geburtsdatum: string | null;
};

/**
 * DIE Schnittstelle nach aussen. Anbieterunabhaengig geschnitten:
 * Wer den Anbieter wechselt, tauscht nur den Rumpf dieser Funktion.
 *
 * Gibt null zurueck, solange keine Zugangsdaten gesetzt sind. Die
 * Oberflaeche zeigt dann unveraendert Stufe eins.
 */
export async function pruefeBonitaet(
  anfrage: BonitaetsAnfrage
): Promise<BonitaetsErgebnis | null> {
  if (!bonitaetAbfrageAktiv()) return null;

  if (bonitaetImMock()) {
    return {
      mock: true,
      befund: "ohne_eintrag",
      hinweis:
        "Beispiel-Antwort aus dem Testbetrieb. Es wurde keine echte Auskunft eingeholt.",
      abgefragt_am: new Date().toISOString(),
      anbieter: "Testbetrieb",
    };
  }

  // TODO Anbieter: Sobald der Vertrag steht, hier den echten Aufruf
  // einsetzen. Nur dieser Block aendert sich, alles davor und danach
  // bleibt. Erwartet wird eine Antwort, die sich auf die drei Befunde
  // oben abbilden laesst.
  try {
    const antwort = await fetch(process.env.BONITAET_API_URL as string, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BONITAET_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(anfrage),
      signal: AbortSignal.timeout(15_000),
    });
    if (!antwort.ok) {
      console.error("[bonitaet] Abfrage fehlgeschlagen:", antwort.status);
      return null;
    }
    const roh = (await antwort.json()) as Record<string, unknown>;
    // Die Zuordnung der Anbieter-Felder wird beim ersten echten Abruf
    // nachgezogen, so wie bei Sprengnetter auch. Bis dahin bewusst
    // vorsichtig: alles, was nicht eindeutig ist, wird "keine_auskunft".
    return {
      mock: false,
      befund:
        roh.negativmerkmale === false
          ? "ohne_eintrag"
          : roh.negativmerkmale === true
            ? "eintrag"
            : "keine_auskunft",
      hinweis: typeof roh.hinweis === "string" ? roh.hinweis : null,
      abgefragt_am: new Date().toISOString(),
      anbieter: process.env.BONITAET_ANBIETER ?? "Auskunftei",
    };
  } catch (fehler) {
    console.error("[bonitaet] Abfrage fehlgeschlagen:", fehler);
    return null;
  }
}

/* ================================================================== */
/* Aufraeumen                                                          */
/* ================================================================== */

/*
 * Die Loeschfrist loeschen_ab vollstreckt der Zeitplan-Auftrag
 * "Frist-Loeschungen" (lib/frist-loeschungen.ts, Bau-Runde 9).
 *
 * Hier stand bis dahin abgelaufeneNachweiseAufraeumen(), eine
 * Funktion, die NIEMAND aufrief: Die Frist wurde bei jedem Upload
 * gesetzt und nie vollstreckt, obwohl der Einwilligungstext die
 * Loeschung nach 90 Tagen ausdruecklich zusagt. Ihr Nachfolger
 * loescht die Datei zuerst und gemessen, dann die Zeile, und laeuft
 * im Zeitplan mit, damit ihm nicht dasselbe passiert.
 */
