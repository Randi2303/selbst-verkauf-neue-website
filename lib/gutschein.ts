import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ausgeblieben, gewirkt, type Wirkung } from "@/lib/wirkung";

/**
 * Gutschein-Pruefung, ausschliesslich auf dem Server.
 *
 * Der Browser schickt nur den TEXT des Codes; jede Regel wird hier
 * gegen die Datenbank geprueft, und der Abzug entsteht danach an
 * genau einer Stelle, in lib/bestellung.ts neben dem
 * Sofortzahlungs-Rabatt. Es gibt keinen zweiten Rechenweg.
 *
 * DIE EINE REGEL: Ein Gutschein wirkt nur auf einmalige Positionen,
 * niemals auf monatliche. Ein Prozentsatz auf ein Abo liefe bei
 * Stripe Monat fuer Monat weiter und stuende nach der dritten
 * Abrechnung in einem laufenden Vertrag.
 *
 * MELDUNGEN MIT GRUND: "Ungueltig" ist an der Kasse eine Abweisung.
 * Der Kunde erfaehrt, OB der Code abgelaufen, aufgebraucht, fuer
 * seinen Warenkorb nicht gedacht oder von ihm schon eingeloest ist.
 * Nur der erfundene und der abgeschaltete Code teilen sich bewusst
 * eine Meldung: Ein abgeschalteter Code soll nicht verraten, dass es
 * ihn (noch) gibt.
 */

export type Gutschein = {
  id: string;
  code: string;
  art: "prozent" | "betrag";
  wert: number;
  gueltig_von: string;
  gueltig_bis: string;
  limit_gesamt: number;
  limit_je_kunde: number;
  mindestbestellwert: number | null;
  leistungs_ids: string[] | null;
  aktiv: boolean;
  anlass: string;
};

export type GutscheinGrund =
  | "unbekannt"
  | "abgelaufen"
  | "noch_nicht"
  | "aufgebraucht"
  | "je_kunde"
  | "mindestwert"
  | "korb_passt_nicht"
  | "nur_monatlich";

export type GutscheinPruefung =
  | { ok: true; gutschein: Gutschein }
  | { ok: false; grund: GutscheinGrund; meldung: string };

/** Vergleichsform: Grossschreibung und Randleerzeichen sind egal */
export function gutscheinCodeNormalisieren(code: string): string {
  return code.trim().toLowerCase();
}

export function gutscheinMeldung(grund: GutscheinGrund, gutschein?: Gutschein): string {
  switch (grund) {
    case "abgelaufen":
      return "Dieser Code ist leider abgelaufen. Er galt bis zum Ende der Aktion.";
    case "noch_nicht": {
      const ab = gutschein
        ? new Date(gutschein.gueltig_von).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : null;
      return ab
        ? `Dieser Code gilt erst ab dem ${ab}. Bis dahin bitte noch etwas Geduld.`
        : "Dieser Code gilt noch nicht.";
    }
    case "aufgebraucht":
      return "Dieser Code ist bereits aufgebraucht, alle Einlösungen sind vergeben.";
    case "je_kunde":
      return "Diesen Code haben Sie bereits eingelöst, er gilt nur einmal je Kunde.";
    case "mindestwert":
      return gutschein?.mindestbestellwert
        ? `Dieser Code gilt ab einem Bestellwert von ${gutschein.mindestbestellwert} € bei den einmaligen Leistungen.`
        : "Der Bestellwert reicht für diesen Code noch nicht.";
    case "korb_passt_nicht":
      return "Dieser Code gilt für bestimmte Leistungen, die gerade nicht in Ihrem Warenkorb liegen.";
    case "nur_monatlich":
      return "Dieser Code gilt nur für einmalige Leistungen. In Ihrem Warenkorb liegen ausschließlich monatliche Posten.";
    default:
      return "Diesen Code kennen wir nicht. Bitte prüfen Sie die Schreibweise.";
  }
}

/**
 * Findet den Code und prueft alles, was OHNE Reservierung pruefbar
 * ist: Existenz, Schalter, Zeitraum, Gesamt-Limit, Je-Kunde-Limit
 * (sofern die Adresse schon bekannt ist). Die harte, wettlaufsichere
 * Zaehlung passiert erst bei der Reservierung in der Datenbank
 * (gutschein_reservieren, Migration 0053); diese Vorpruefung sorgt
 * nur dafuer, dass die Kasse frueh und freundlich Bescheid sagt.
 */
export async function gutscheinFinden(
  service: SupabaseClient,
  codeText: string,
  email?: string | null
): Promise<GutscheinPruefung> {
  const norm = gutscheinCodeNormalisieren(codeText);
  if (!norm) {
    return { ok: false, grund: "unbekannt", meldung: gutscheinMeldung("unbekannt") };
  }
  const { data: alle } = await service
    .from("gutscheine")
    .select("*")
    .returns<Gutschein[]>();
  const gutschein = (alle ?? []).find(
    (g) => gutscheinCodeNormalisieren(g.code) === norm
  );
  /* Abgeschaltet antwortet wie unbekannt, mit Absicht: Ein stillgelegter
     Code soll nicht verraten, dass er existiert. */
  if (!gutschein || !gutschein.aktiv) {
    return { ok: false, grund: "unbekannt", meldung: gutscheinMeldung("unbekannt") };
  }
  const jetzt = Date.now();
  if (new Date(gutschein.gueltig_von).getTime() > jetzt) {
    return {
      ok: false,
      grund: "noch_nicht",
      meldung: gutscheinMeldung("noch_nicht", gutschein),
    };
  }
  if (new Date(gutschein.gueltig_bis).getTime() < jetzt) {
    return { ok: false, grund: "abgelaufen", meldung: gutscheinMeldung("abgelaufen") };
  }

  const { count: belegt } = await service
    .from("gutschein_einloesungen")
    .select("id", { count: "exact", head: true })
    .eq("gutschein_id", gutschein.id)
    .in("status", ["schwebend", "eingeloest"]);
  if ((belegt ?? 0) >= gutschein.limit_gesamt) {
    return { ok: false, grund: "aufgebraucht", meldung: gutscheinMeldung("aufgebraucht") };
  }

  if (email?.trim()) {
    const { count: eigene } = await service
      .from("gutschein_einloesungen")
      .select("id", { count: "exact", head: true })
      .eq("gutschein_id", gutschein.id)
      .eq("email", email.trim().toLowerCase())
      .in("status", ["schwebend", "eingeloest"]);
    if ((eigene ?? 0) >= gutschein.limit_je_kunde) {
      return { ok: false, grund: "je_kunde", meldung: gutscheinMeldung("je_kunde") };
    }
  }
  return { ok: true, gutschein };
}

/** Reservierung einer Bestellung wieder freigeben (Abbruch, Ablauf,
    endgueltig gescheiterte Zahlung). Bedingter Statuswechsel: Nur eine
    noch schwebende Reservierung wird frei, eine bestaetigte nie.

    ANTWORTET SEIT DEM 16.08.2026 (lib/wirkung.ts): Bleibt die Freigabe
    aus, bleibt ein Platz des Gutscheins fuer immer belegt, obwohl
    niemand gezahlt hat. Der naechste Kunde bekommt ihn nicht.

    NULL ZEILEN IST HIER KEIN FEHLER, sondern der Normalfall bei einer
    Bestellung ohne Gutschein und beim wiederholten Aufruf. Der einzige
    brauchbare Nachweis ist deshalb, dass die Datenbank nicht gemeckert
    hat. */
export async function gutscheinFreigeben(
  service: SupabaseClient,
  bestellungId: string
): Promise<Wirkung> {
  const { error } = await service
    .from("gutschein_einloesungen")
    .update({ status: "freigegeben" })
    .eq("bestellung_id", bestellungId)
    .eq("status", "schwebend");
  if (error) {
    console.error("[gutschein] Freigabe fehlgeschlagen:", bestellungId, error.message);
    return ausgeblieben(
      `Die Gutschein-Reservierung dieser Bestellung wurde nicht freigegeben (${error.message}). Der Platz bleibt belegt, bitte im internen Bereich nachsehen.`
    );
  }
  return gewirkt();
}

/** Reservierung nach bestaetigter Zahlung in eine Einloesung wandeln.
    Idempotent: Nur schwebend wird eingeloest, Wiederholungen tun nichts.

    Bleibt die Wandlung aus, steht der Gutschein weiter auf "schwebend":
    Die Zahlung ist bestaetigt, die Einloesung nicht, und die Auswertung
    der Gutscheine zaehlt falsch. Dieselbe Bauart wie oben. */
export async function gutscheinEinloesen(
  service: SupabaseClient,
  bestellungId: string
): Promise<Wirkung> {
  const { error } = await service
    .from("gutschein_einloesungen")
    .update({ status: "eingeloest" })
    .eq("bestellung_id", bestellungId)
    .eq("status", "schwebend");
  if (error) {
    console.error("[gutschein] Einloesung fehlgeschlagen:", bestellungId, error.message);
    return ausgeblieben(
      `Der Gutschein dieser Bestellung wurde nicht als eingeloest vermerkt (${error.message}). Bitte im internen Bereich nachsehen.`
    );
  }
  return gewirkt();
}
