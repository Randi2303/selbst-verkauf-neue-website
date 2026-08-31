import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MELDUNGS_THEMEN,
  themaZurKennung,
  type AbschaltbareKennung,
  type MeldungsWahl,
  type ThemaId,
} from "@/config/meldungs-themen";

/**
 * DIE EINE STELLE, DIE FRAGT, OB DIESE MAIL HINAUSGEHEN DARF.
 *
 * =====================================================================
 * WAS SICH AM 30.08.2026 GEAENDERT HAT
 * =====================================================================
 * Bis dahin entschied EIN Wahrheitswert fuer alle Mails zugleich:
 * `profiles.mail_benachrichtigungen`. Er wurde an genau einer Stelle
 * gelesen (`empfaengerFuerHinweis`), und das war gut; er konnte nur
 * nichts unterscheiden. Wer nach der dritten Anfrage-Mail an einem
 * Sonntag genervt abschaltete, verlor damit auch die Antwort auf seine
 * eigene Fehlermeldung.
 *
 * Jetzt entscheidet der Kunde je THEMA (config/meldungs-themen.ts).
 * Die Enge bleibt: Es liest weiterhin nur eine Stelle, naemlich diese.
 *
 * =====================================================================
 * ABWESENHEIT HEISST JA
 * =====================================================================
 * In `meldungs_einstellungen` stehen nur ABWEICHUNGEN. Keine Zeile
 * heisst Voreinstellung, und die ist an. Das hat zwei Folgen, die man
 * beim Lesen kennen muss:
 *
 *   1. Ein NEUES Thema ist fuer alle sofort an, ohne dass eine
 *      Migration Zeilen nachtragen muss.
 *   2. Ein FEHLER beim Lesen fuehrt dazu, dass die Mail hinausgeht.
 *      Das ist die richtige Richtung: Eine Benachrichtigung zu viel
 *      ist aergerlich, eine fehlende Anfrage kostet den Verkauf. Der
 *      Fehler steht im Server-Log, damit er nicht still bleibt.
 *
 * =====================================================================
 * DIE GLOCKE FRAGT HIER NIE
 * =====================================================================
 * `meldeDemKunden` ruft diese Datei nicht auf und soll es nie tun. In
 * der Glocke steht immer alles; abwaehlbar ist nur die Mail. Die drei
 * Gruende stehen im Kopf von config/meldungs-themen.ts.
 */

/* `MeldungsWahl` steht in config/meldungs-themen.ts, weil der
   Browser-Anbieter denselben Typ braucht und diese Datei server-only
   ist. Hier nur weitergereicht. */
export type { MeldungsWahl };

/** Alles an: die Voreinstellung, ausgeschrieben. */
export function alleAn(): MeldungsWahl {
  const wahl = {} as MeldungsWahl;
  for (const thema of MELDUNGS_THEMEN) wahl[thema.id] = true;
  return wahl;
}

/**
 * Die Wahl eines Kunden, vollstaendig und mit Voreinstellungen
 * aufgefuellt. Fuer die Oberflaeche.
 *
 * Der uebergebene Client entscheidet, was sichtbar ist: Mit dem
 * Sitzungs-Client greift RLS, mit dem Dienst-Client nicht. Beide Wege
 * gibt es, und beide sind hier richtig.
 */
export async function meldungsWahlLesen(
  client: SupabaseClient | null,
  userId: string
): Promise<MeldungsWahl> {
  const wahl = alleAn();
  if (!client) return wahl;
  const { data, error } = await client
    .from("meldungs_einstellungen")
    .select("thema, mail_an")
    .eq("user_id", userId)
    .returns<{ thema: string; mail_an: boolean }[]>();
  if (error) {
    // wirkung: gewollt, im Zweifel geht die Mail hinaus; siehe Kopf
    console.error("[meldungs-einstellungen] Nicht gelesen:", error.message);
    return wahl;
  }
  for (const zeile of data ?? []) {
    /* Eine Zeile zu einem Thema, das es NICHT MEHR GIBT, wird still
       uebergangen und nicht etwa angelegt. Sie kann nur entstehen,
       wenn ein Thema aus dem Katalog verschwindet; dann ist die
       richtige Antwort, sie zu ignorieren, statt eine erfundene
       Einstellung anzuzeigen. */
    if (zeile.thema in wahl) wahl[zeile.thema as ThemaId] = zeile.mail_an;
  }
  return wahl;
}

/**
 * Darf diese Mail hinausgehen?
 *
 * Nimmt die MAIL-Kennung, nicht das Thema: An der Sende-Stelle steht
 * die Kennung, und eine Uebersetzung an jeder einzelnen Stelle waere
 * genau die Sorte Wiederholung, die auseinanderlaeuft.
 */
export async function mailErlaubt(
  client: SupabaseClient | null,
  userId: string,
  kennung: AbschaltbareKennung
): Promise<boolean> {
  const thema = themaZurKennung(kennung);
  if (!thema) {
    /* Kann der Typ eigentlich nicht zulassen. Wenn es doch geschieht
       (etwa ueber einen Aufruf aus untypisiertem Kode), geht die Mail
       hinaus und der Fall steht im Log. Schweigen waere hier die
       schlechtere Wahl. */
    console.error("[meldungs-einstellungen] Kennung ohne Thema:", kennung);
    return true;
  }
  if (!client) return true;
  const { data, error } = await client
    .from("meldungs_einstellungen")
    .select("mail_an")
    .eq("user_id", userId)
    .eq("thema", thema.id)
    .maybeSingle<{ mail_an: boolean }>();
  if (error) {
    // wirkung: gewollt, im Zweifel geht die Mail hinaus; siehe Kopf
    console.error("[meldungs-einstellungen] Nicht gelesen:", error.message);
    return true;
  }
  /* KEINE ZEILE HEISST JA. Siehe Kopf. */
  return data?.mail_an ?? true;
}
