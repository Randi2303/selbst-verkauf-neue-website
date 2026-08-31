import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FOTO_AUFBEREITUNG } from "@/config/kontingente";

/**
 * Kontingente für kostenpflichtige Abrufe (Foto-KI, Sprengnetter).
 *
 * Regel: Vor JEDEM kostenpflichtigen Abruf wird das Kontingent
 * geprüft, danach der Verbrauch hochgezählt. Existiert kein Eintrag,
 * gilt das Standard-Limit. Die bestehende Obergrenze je Tag bleibt
 * als zusätzlicher Schutz unangetastet. Im Admin je Kunde einstellbar.
 */

export const KONTINGENT_SCHLUESSEL = [
  "foto_verbesserungen",
  "bewertungs_abrufe",
  "ki_texte",
  "assistent_fragen",
] as const;

export type KontingentSchluessel = (typeof KONTINGENT_SCHLUESSEL)[number];

/** Standard-Limits, solange kein eigener Eintrag existiert */
export const KONTINGENT_STANDARD: Record<KontingentSchluessel, number> = {
  /* NULL, und das ist seit dem 13.08.2026 der Kern der Sache: Die
     Foto-Aufbereitung kostet uns bei JEDEM Bild Geld. Sie hing vorher
     an einer Umgebungsvariablen, also entweder an gar nichts oder an
     unbegrenzt. Jetzt haengt sie an einer Buchung: Wer ein Paket mit
     Expose hat, bekommt sein Kontingent bei der Freischaltung gesetzt
     (lib/freischaltung.ts), wer mehr braucht, kauft Bilder dazu. Ohne
     Buchung ist die Vorgabe null, und die Oberflaeche sagt das ruhig,
     statt den Knopf verschwinden zu lassen. */
  foto_verbesserungen: 0,
  /* EINS, entschieden am 14.08.2026. Jeder Abruf kostet uns bei
     Sprengnetter Geld, und der Knopf sagte das nicht. Zehn war eine
     Zahl ohne Überlegung: Niemand braucht zehn Einschätzungen
     desselben Hauses, und wer eine zweite braucht, bekommt sie vom
     Team hochgesetzt.

     Die Fassung "Preis an den Knopf plus Rückfrage" ist bewusst
     verworfen: Eine Warnung hält nur, solange jemand an sie denkt,
     eine Grenze hält von selbst. */
  bewertungs_abrufe: 1,
  // Ein Text kostet rund einen Cent; die Grenze schuetzt vor Versehen
  // und Missbrauch, nicht vor normaler Nutzung
  ki_texte: 60,
  /* ZWEIHUNDERT FRAGEN AN DEN ASSISTENTEN (Runde 19). Eine Frage
     kostet zwei Abrufe und damit rund zwei Cent, das sind vier Euro
     ueber die gesamte Verkaufsdauer eines Kunden.

     WICHTIG ZUM VERSTAENDNIS DIESER ZAHL: Es gibt im Haus KEINEN
     monatlichen Reset, `verbraucht` waechst. Die 200 gelten also fuer
     die ganze Zeit und nicht je Monat. Wer sie erreicht, bekommt
     weiterhin alles, was der kurze Weg ohne Abruf beantwortet, und
     einen Satz, der sagt wie es weitergeht. Im Admin je Kunde
     anhebbar, wie die anderen drei. */
  assistent_fragen: 200,
};

export const KONTINGENT_LABELS: Record<KontingentSchluessel, string> = {
  foto_verbesserungen: "Foto-Verbesserungen",
  bewertungs_abrufe: "Bewertungs-Abrufe",
  ki_texte: "KI-Texte",
  assistent_fragen: "Fragen an den Assistenten",
};

export type KontingentStand = {
  limit: number;
  verbraucht: number;
  erschoepft: boolean;
};

/** Aktuellen Stand lesen (Service- oder angemeldeter Client) */
export async function kontingentStand(
  client: SupabaseClient,
  userId: string,
  schluessel: KontingentSchluessel
): Promise<KontingentStand> {
  const { data } = await client
    .from("kontingente")
    .select("limit_anzahl, verbraucht")
    .eq("user_id", userId)
    .eq("schluessel", schluessel)
    .maybeSingle<{ limit_anzahl: number; verbraucht: number }>();
  const limit = data?.limit_anzahl ?? KONTINGENT_STANDARD[schluessel];
  const verbraucht = data?.verbraucht ?? 0;
  return { limit, verbraucht, erschoepft: verbraucht >= limit };
}

export type KontingentReservierung = KontingentStand & {
  /** War noch etwas frei? Nur dann ist eine Einheit reserviert. */
  ok: boolean;
};

/**
 * EINE EINHEIT RESERVIEREN, VOR dem kostenpflichtigen Abruf.
 *
 * DER WEG WAR VORHER: prüfen, abrufen, zählen. Das hielt zwei
 * gleichzeitige Anfragen nicht auseinander, weil beide beim Prüfen
 * dieselbe Zahl lasen. GEMESSEN am 15.08.2026: zwei Markteinschätzungen
 * gleichzeitig bei EINEM freien Abruf ergaben zwei Einschätzungen und
 * einen Verbrauch von 2 bei Limit 1. Zwei Rechnungen von Sprengnetter.
 *
 * Ein unteilbares Hochzählen allein (0074) reicht dafür nicht: Es
 * verhindert nur verlorene Zählungen, nicht den zweiten Abruf. Prüfung
 * und Zählung müssen EIN Schritt sein und VOR dem Abruf stehen
 * (Migration 0075).
 *
 * WER RESERVIERT, MUSS FREIGEBEN. Scheitert der Abruf danach, gehört
 * die Einheit zurück, sonst zählt ein fehlgeschlagener Abruf mit.
 * Dafür ist kontingentFreigeben() da.
 *
 * Gibt null zurück, wenn die Datenbank nicht antwortet. Das ist NICHT
 * dasselbe wie ok: false: Beim einen wissen wir nichts, beim anderen
 * wissen wir, dass nichts frei ist. Ein Aufrufer, der Geld ausgibt,
 * muss beides unterscheiden können.
 */
export async function kontingentReservieren(
  service: SupabaseClient,
  userId: string,
  schluessel: KontingentSchluessel
): Promise<KontingentReservierung | null> {
  const { data, error } = await service.rpc("kontingent_verbrauchen", {
    p_user: userId,
    p_schluessel: schluessel,
    p_standard: KONTINGENT_STANDARD[schluessel],
  });
  const zeile = Array.isArray(data) ? data[0] : data;
  if (error || !zeile) {
    console.error(
      "[kontingent] Reservieren fehlgeschlagen:",
      error?.message ?? "keine Zeile zurück"
    );
    return null;
  }
  /* OHNE ok IST DIE ANTWORT UNBRAUCHBAR. Sie kommt dann von der
     Fassung aus 0074, die bedingungslos hochzählt und kein ok kennt.
     Boolean(undefined) wäre false, und der Aufrufer meldete
     "aufgebraucht", obwohl gerade hochgezählt wurde: eine falsche
     Auskunft und ein verlorener Abruf in einem. Deshalb hier
     ausdrücklich null, also "nicht erreichbar", und ein Satz ins
     Protokoll, der sagt, was fehlt. */
  if (typeof zeile.ok !== "boolean") {
    console.error(
      "[kontingent] Die Datenbank-Funktion kennt kein ok. Migration 0075 ist nicht eingespielt."
    );
    return null;
  }
  const verbraucht = Number(zeile.verbraucht);
  const limit = Number(zeile.limit_anzahl);
  return {
    ok: zeile.ok,
    limit,
    verbraucht,
    erschoepft: verbraucht >= limit,
  };
}

/**
 * Eine reservierte Einheit zurückgeben, wenn der Abruf danach
 * gescheitert ist.
 *
 * Ein Fehlschlag darf nichts kosten. Diese Funktion ist die eine
 * Hälfte der Vorgabe „ein fehlgeschlagener Abruf zählt nicht"; die
 * andere ist, dass sie in JEDEM Fehlerpfad aufgerufen wird, auch im
 * unerwarteten. Deshalb steht sie bei den Aufrufern im catch und
 * nicht hinter einer Bedingung.
 */
export async function kontingentFreigeben(
  service: SupabaseClient,
  userId: string,
  schluessel: KontingentSchluessel
): Promise<void> {
  const { error } = await service.rpc("kontingent_freigeben", {
    p_user: userId,
    p_schluessel: schluessel,
  });
  if (error) {
    /* Laut melden: Der Kunde hat jetzt eine Einheit weniger, ohne
       etwas dafür bekommen zu haben.

       SEIT DEM 16.08.2026 AUCH AN EINEN MENSCHEN. "Laut" hieß bis
       dahin: eine Zeile im Server-Protokoll, die niemand liest. Der
       Kunde merkt es an einer Grenze, die er nicht erreicht haben
       dürfte, und ruft an. */
    console.error("[kontingent] Freigeben fehlgeschlagen:", error.message);
    const { melde } = await import("@/lib/ereignis");
    await melde({
      ereignis: "bestellung.fehler",
      empfaenger: { art: "admin" },
      kurztext: `Ein gescheiterter Abruf (${schluessel}) wurde dem Kunden nicht zurueckgegeben. Bitte das Kontingent um eins anheben.`,
      kennungen: { kunde: userId },
      adminPfad: "/admin/kunden",
    });
  }
}

/**
 * Ein Kontingent anheben, unteilbar in der Datenbank.
 *
 * "mindestens" fuer das, was in einem Paket steckt: Wird dieselbe
 * Buchung ein zweites Mal freigeschaltet, verdoppelt sich nichts.
 * "erhoehen" fuer Dazugekauftes: Ein zweiter Kauf zaehlt sehr wohl.
 *
 * Die Rechnung steht in der Datenbank und nicht hier, weil sich zwei
 * Freischaltungen desselben Kontos sonst ueberholen koennen und nur
 * die letzte zaehlt (Migration 0063).
 */
export async function kontingentAnheben(
  service: SupabaseClient,
  userId: string,
  schluessel: KontingentSchluessel,
  betrag: number,
  art: "erhoehen" | "mindestens"
): Promise<number | null> {
  const { data, error } = await service.rpc("kontingent_anheben", {
    p_user: userId,
    p_schluessel: schluessel,
    p_betrag: betrag,
    p_art: art,
  });
  if (error) {
    console.error("[kontingent] Anheben fehlgeschlagen:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

/**
 * Freundliche Meldung bei erschöpftem Kontingent.
 *
 * EIN SATZ STATT EINER STUMMEN SPERRE. Wer an eine Grenze stößt, soll
 * lesen, woran er ist und was er tun kann; ein Knopf, der nichts tut,
 * ist die schlechtere Antwort.
 *
 * Die Markteinschätzung hat ihren eigenen Wortlaut. Der allgemeine
 * Satz spricht von einem "Kontingent, das aufgebraucht ist", und das
 * trifft einen Vorgang, den man genau einmal hat, nicht: Dort geht es
 * nicht um Nachkaufen, sondern darum, dass die Einschätzung schon
 * vorliegt.
 */
export function erschoepftMeldung(schluessel: KontingentSchluessel): string {
  if (schluessel === "bewertungs_abrufe") {
    return "Ihre Markteinschätzung liegt bereits vor, sie steht weiter unten auf dieser Seite. Ein erneuter Abruf ist im Preis nicht enthalten. Wenn sich an Ihrer Immobilie etwas Wesentliches geändert hat, melden Sie sich kurz bei uns, dann schalten wir einen weiteren frei.";
  }
  if (schluessel === "foto_verbesserungen") {
    /* Der Satz nennt den Weg, nicht nur die Grenze. Die Zahlen kommen
       aus config/kontingente.ts, damit sie nie veralten. */
    return `Alle Bilder Ihres Kontingents sind übernommen. Weitere Bilder buchen Sie unter Leistungen dazu (${FOTO_AUFBEREITUNG.preisJeBild} € je Bild), oder Sie melden sich kurz bei uns.`;
  }
  const label = KONTINGENT_LABELS[schluessel];
  return `Ihr Kontingent für ${label} ist aufgebraucht. Gern schalten wir mehr frei: Buchen Sie die passende Leistung dazu oder melden Sie sich kurz bei uns.`;
}
