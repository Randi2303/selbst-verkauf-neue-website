import { supabaseService } from "@/lib/supabase/service";
import {
  VORFUEHR_ANFRAGEN_ALIAS,
  VORFUEHR_KENNUNG,
  VORFUEHR_SEITE_KENNUNG,
} from "@/config/vorfuehrkonto.mjs";

/**
 * DAS VORFÜHRKONTO.
 *
 * Ein ganz normales Kundenkonto, gefüllt mit erfundenen Daten, damit
 * sich jeder Bereich zeigen lässt, ohne echte Menschen vorzuführen.
 * Angelegt und zurückgesetzt wird es mit `npm run vorfuehrkonto`.
 *
 * VIER DINGE MÜSSEN ES ANDERS BEHANDELN, und alle vier fragen hier:
 *
 *   1. Aus ihm geht keine Mail nach draußen (lib/mail.ts)
 *   2. Der Löschlauf lässt seine Akten in Ruhe (lib/loeschlauf.ts)
 *   3. Es zählt nicht als Kunde (app/admin)
 *   4. Der Erinnerungs-Wächter mahnt seine Vorgänge nicht an
 *      (lib/wartet-lauf.ts, seit dem 21.08.2026)
 *
 * WARUM DER VIERTE NICHT VON ANFANG AN GENÜGTE, was Punkt 1 leistet:
 * Punkt 1 greift am EMPFÄNGER. Bei einer Mail an den Kunden ist das
 * Vorführkonto der Empfänger und der Riegel hält sie an. Bei einer
 * Mail an das TEAM sind WIR der Empfänger, und sie ging wirklich
 * hinaus. Gemessen: Die unbeantwortete Unterhaltung des Vorführkontos
 * mahnte alle vier Stunden das Team an, mit echtem Versand und echtem
 * Kontingent. Aus erfundenen Daten wurde echte Post.
 *
 * SONST NICHTS. Es soll sich überall dort, wo jemand hinsieht, wie ein
 * echtes Konto verhalten; ein Konto mit Sonderwegen führt etwas vor,
 * das es nicht gibt. Deshalb bleiben die Vorgänge in /admin/liegt-an
 * auch sichtbar: Wer vorführt, soll die Liste gefüllt sehen.
 */

/**
 * Kurzes Gedächtnis, damit nicht jede einzelne Mail eine Abfrage
 * auslöst. Zwei Minuten: lang genug für einen Vorgang mit mehreren
 * Mails, kurz genug, dass ein frisch gesetztes Kennzeichen sofort
 * greift.
 */
const GEDAECHTNIS_MS = 2 * 60 * 1000;
const gemerkt = new Map<string, { wert: boolean; bis: number }>();

/** Gehört dieser Vorgang zu einem Vorführkonto? */
export async function istVorfuehrkonto(
  userId?: string | null
): Promise<boolean> {
  if (!userId) return false;

  /* =================================================================
     SCHICHT 1: DAS FESTE WISSEN, seit dem 31.08.2026
     =================================================================
     Sie steht VOR allem anderen, auch vor dem Gedächtnis, und sie kann
     nicht ausfallen: Es gibt hier nichts zu fragen.

     WARUM SIE NÖTIG WURDE, gemessen und nicht vermutet: Ohne
     Dienst-Zugang lieferte diese Funktion `false`, der Riegel in
     lib/mail.ts ließ durch, und der Aufruf lief bis zu Resend. Der
     Riegel war damit ausgerechnet dann offen, wenn etwas nicht
     stimmte. Der Nachweis liegt in
     uebergabe/60-bericht-riegel-ohne-dienst-2026-08-31.md.

     Die Regel des Inhabers dazu: Wo das Wissen fest ist, gehört es in
     die Konfiguration, und die Abfrage bleibt als zweite Schicht
     daneben. */
  if (userId === VORFUEHR_KENNUNG) return true;

  const eintrag = gemerkt.get(userId);
  if (eintrag && eintrag.bis > Date.now()) return eintrag.wert;

  /* =================================================================
     SCHICHT 2: DIE ABFRAGE
     =================================================================
     Sie fängt, was Schicht 1 nicht wissen kann: ein ZWEITES Konto mit
     dem Kennzeichen, oder eine Kennung, die sich geändert hat, weil
     jemand das Konto neu angelegt hat.

     IM ZWEIFEL NEIN, und das bleibt richtig: Eine fehlgeschlagene
     Abfrage darf nicht dazu führen, dass echte Kundenmails plötzlich
     nicht mehr hinausgehen. Der Unterschied zu vorher ist, dass das
     eine BEKANNTE Konto nicht mehr an dieser Abfrage hängt. */
  const service = supabaseService();
  if (!service) return false;
  const { data } = await service
    .from("profiles")
    .select("vorfuehrkonto")
    .eq("id", userId)
    .maybeSingle<{ vorfuehrkonto: boolean }>();

  const wert = data?.vorfuehrkonto === true;
  gemerkt.set(userId, { wert, bis: Date.now() + GEDAECHTNIS_MS });
  return wert;
}

/**
 * Stimmt die feste Kennung noch mit der Datenbank überein?
 *
 * DIE PRÜFUNG IST DER EIGENTLICHE GEWINN (Inhaber, 31.08.2026): "Eine
 * gewechselte Kennung fällt dann auf, statt still zu wirken. Ohne sie
 * hätten wir die Falle nur verschoben."
 *
 * Sie braucht die Datenbank und kann deshalb NICHT in die Baukette;
 * alle 46 Prüfungen dort lesen Dateien. Sie läuft dort, wo eine
 * Abweichung entsteht oder auffallen muss: im Anlege-Skript
 * (scripts/vorfuehrkonto.mjs) und in `npm run wege`, und damit auch im
 * Riegel vor dem Push.
 */
export async function kennungStimmt(): Promise<{
  ok: boolean;
  grund: string;
  ausDerDatenbank: string[];
}> {
  const service = supabaseService();
  if (!service) {
    return {
      ok: false,
      grund:
        "Ohne Dienst-Zugang lässt sich die Kennung nicht gegenprüfen. Das ist keine Abweichung, sondern eine fehlende Messung.",
      ausDerDatenbank: [],
    };
  }
  const { data, error } = await service
    .from("profiles")
    .select("id")
    .eq("vorfuehrkonto", true);
  if (error) {
    return {
      ok: false,
      grund: `Die Profile ließen sich nicht lesen: ${error.message}`,
      ausDerDatenbank: [],
    };
  }
  const ausDerDatenbank = (data ?? []).map((p) => p.id as string);
  if (ausDerDatenbank.length === 0) {
    return {
      ok: false,
      grund:
        "Kein einziges Konto trägt das Kennzeichen vorfuehrkonto. Die feste Kennung zeigt damit auf ein Konto, das es nicht mehr gibt.",
      ausDerDatenbank,
    };
  }
  if (!ausDerDatenbank.includes(VORFUEHR_KENNUNG)) {
    return {
      ok: false,
      grund:
        `Die feste Kennung ${VORFUEHR_KENNUNG} trägt das Kennzeichen NICHT. ` +
        `Das tun stattdessen: ${ausDerDatenbank.join(", ")}. ` +
        `Wurde das Konto neu angelegt? Dann gehört die neue Kennung in config/vorfuehrkonto.mjs.`,
      ausDerDatenbank,
    };
  }
  if (ausDerDatenbank.length > 1) {
    return {
      ok: false,
      grund:
        `${ausDerDatenbank.length} Konten tragen das Kennzeichen: ${ausDerDatenbank.join(", ")}. ` +
        `Die feste Kennung deckt nur eines; die übrigen hängen allein an der Abfrage.`,
      ausDerDatenbank,
    };
  }
  /* =================================================================
     UND DIESELBE FRAGE FUER DIE ZWEI VEROEFFENTLICHTEN WERTE
     =================================================================
     Auflage des Inhabers, 31.08.2026: "Dieselbe Gegenprobe wie bei der
     Kennung. Sonst haben wir denselben blinden Fleck ein Stueck weiter
     rechts, und das ist heute schon zweimal passiert."

     Beide werden beim Entfernen abgelegt und beim Aufbau gelesen.
     Weicht die Ablage von der Datenbank ab, zeigt ein gedruckter
     QR-Code auf etwas anderes als das, was die Datei behauptet. */
  const { data: objekt } = await service
    .from("objekte")
    .select("seite_kennung, anfragen_alias")
    .eq("user_id", VORFUEHR_KENNUNG)
    .maybeSingle<{ seite_kennung: string | null; anfragen_alias: string | null }>();
  if (!objekt) {
    return {
      ok: false,
      grund:
        "Zum Vorführkonto gibt es kein Objekt. Die abgelegte Seiten-Kennung zeigt dann auf nichts.",
      ausDerDatenbank,
    };
  }
  const abweichungen: string[] = [];
  if (VORFUEHR_SEITE_KENNUNG && objekt.seite_kennung !== VORFUEHR_SEITE_KENNUNG) {
    abweichungen.push(
      `seite_kennung: abgelegt "${VORFUEHR_SEITE_KENNUNG}", in der Datenbank "${objekt.seite_kennung}"`
    );
  }
  if (VORFUEHR_ANFRAGEN_ALIAS && objekt.anfragen_alias !== VORFUEHR_ANFRAGEN_ALIAS) {
    abweichungen.push(
      `anfragen_alias: abgelegt "${VORFUEHR_ANFRAGEN_ALIAS}", in der Datenbank "${objekt.anfragen_alias}"`
    );
  }
  if (abweichungen.length > 0) {
    return {
      ok: false,
      grund:
        `Die abgelegten Werte weichen ab. ${abweichungen.join("; ")}. ` +
        `Gedruckte Zettel zeigen dann woandershin als die Datei behauptet; ` +
        `config/vorfuehrkonto.mjs gehört berichtigt.`,
      ausDerDatenbank,
    };
  }

  return {
    ok: true,
    grund:
      `Die feste Kennung ist das einzige Konto mit dem Kennzeichen, und die zwei ` +
      `veröffentlichten Werte stimmen mit der Datenbank überein.`,
    ausDerDatenbank,
  };
}

/** Die Kennungen aller Vorführkonten, für Abfragen mit "not in" */
export async function vorfuehrkontoIds(): Promise<string[]> {
  const service = supabaseService();
  if (!service) return [];
  const { data } = await service
    .from("profiles")
    .select("id")
    .eq("vorfuehrkonto", true);
  return (data ?? []).map((p) => p.id as string);
}
