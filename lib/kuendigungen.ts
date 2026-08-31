import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ohneUmbruch } from "@/lib/utils";

/**
 * Die Kuendigung ueber die oeffentliche Stelle (/kuendigen), und was
 * danach passieren muss.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DIESE DATEI GIBT
 * ---------------------------------------------------------------------
 * Eine Kuendigung ueber das Formular ist WIRKSAM MIT DEM ABSENDEN
 * (§ 312k BGB). Bei uns landete der Eingang in einer Tabelle, die das
 * Team von Hand abarbeitet, und keiner der sechs Auftraege des
 * Zeitplans sah diese Tabelle jemals an. Gemessen am 16.08.2026: Ein
 * 30 Tage alter, unverarbeiteter Eingang ueberstand einen vollen
 * Zeitplan-Lauf unveraendert.
 *
 * Was daraus folgt, wenn es niemand bemerkt: Wir buchen weiter ab von
 * jemandem, der wirksam gekuendigt hat. Er merkt es am Kontoauszug,
 * nicht wir, und er verlangt das Geld zu Recht zurueck.
 *
 * ---------------------------------------------------------------------
 * DIE GRENZE, DIE BLEIBT
 * ---------------------------------------------------------------------
 * Die WIRKUNG traegt weiter ein Mensch ein. Das Formular ist ohne
 * Anmeldung erreichbar, weil das Gesetz genau das verlangt, und damit
 * ist die Eingabe anonym: Wer sie automatisch wirken liesse, koennte
 * mit einer geratenen E-Mail-Adresse fremde Vertraege beenden. Diese
 * Grenze steht seit Migration 0040 und gilt unveraendert.
 *
 * WAS DIE ANWENDUNG UEBERNIMMT, ist das SUCHEN. Suchen ist Lesen und
 * aendert nichts. Das Team bekommt damit den fertigen Vorschlag statt
 * einer E-Mail-Adresse, die es selbst nachschlagen muss, und sieht am
 * Stand sofort, ob der Fall eindeutig ist oder nicht.
 *
 * NACH AUSSEN VERRAET DIE SUCHE NICHTS. Die Antwort an den anonymen
 * Absender ist immer dieselbe, ob wir ein Konto gefunden haben oder
 * nicht. Sonst waere das Formular eine Auskunftsstelle darueber, wer
 * bei uns Kunde ist.
 */

/* --------------------------------------------------------------- */
/* Die Fristen                                                      */
/* --------------------------------------------------------------- */

/**
 * WORAN DIE ZEITEN GEMESSEN SIND (entschieden am 16.08.2026):
 *
 * 1. AM GELD. Stripe bucht monatlich ab. Die Eskalation muss so weit
 *    innerhalb eines Abrechnungszeitraums liegen, dass die naechste
 *    Abbuchung noch zu verhindern ist. 72 Stunden sind ein Zehntel
 *    davon und lassen rund 27 Tage Luft.
 * 2. AN UNSERER EIGENEN ZUSAGE. Auf dem schriftlichen Weg steht
 *    "in der Regel innerhalb eines Werktags". Eine Kuendigung darf
 *    nicht langsamer beantwortet werden als eine gewoehnliche Frage.
 *
 * KALENDERSTUNDEN, NICHT WERKTAGE, und das ist Absicht: Eine
 * Kuendigung, die Freitagabend eingeht, darf nicht erst Dienstag
 * auffallen. Die Rechtslage des Kunden macht am Wochenende keine
 * Pause, unsere Abbuchung auch nicht.
 */
export const KUENDIGUNG_ERINNERUNG_STUNDEN = 24;
export const KUENDIGUNG_ESKALATION_STUNDEN = 72;

/* --------------------------------------------------------------- */
/* Die Zeile                                                        */
/* --------------------------------------------------------------- */

export type ZuordnungsStand = "eindeutig" | "mehrere" | "ohne_buchung" | "kein_konto";

export type KuendigungsEingang = {
  id: string;
  name: string;
  email: string;
  leistung: string;
  zum_wunsch: string;
  nachricht: string | null;
  eingegangen_am: string;
  verarbeitet_am: string | null;
  bestaetigung_verschickt_am: string | null;
  erinnert_am: string | null;
  eskaliert_am: string | null;
  zuordnung_user_id: string | null;
  zuordnung_stand: ZuordnungsStand | null;
  zuordnung_gesucht_am: string | null;
};

export const KUENDIGUNG_FELDER =
  "id, name, email, leistung, zum_wunsch, nachricht, eingegangen_am, verarbeitet_am, " +
  "bestaetigung_verschickt_am, erinnert_am, eskaliert_am, zuordnung_user_id, " +
  "zuordnung_stand, zuordnung_gesucht_am";

/** Wie lange dieser Eingang schon wartet, in vollen Stunden */
export function wartetSeitStunden(eingang: { eingegangen_am: string }, jetzt = new Date()): number {
  const alter = jetzt.getTime() - new Date(eingang.eingegangen_am).getTime();
  return Math.floor(alter / (60 * 60 * 1000));
}

/**
 * Dieselbe Angabe fuer einen Menschen. "Seit 0 Stunden offen" ist
 * richtig gerechnet und trotzdem falsch gelesen: Es klingt nach einem
 * Fehler, wo gerade eben etwas hereinkam.
 */
export function wartetSeitText(stunden: number): string {
  if (stunden < 1) return "Gerade eingegangen";
  if (stunden === 1) return "Seit einer Stunde offen";
  return `Seit ${ohneUmbruch(`${stunden} Stunden`)} offen`;
}

/** Ein Satz zum Stand der Suche, fuer den internen Bereich */
export function zuordnungSatz(eingang: KuendigungsEingang): string {
  switch (eingang.zuordnung_stand) {
    case "eindeutig":
      return "Ein Konto mit genau einer laufenden Buchung gefunden.";
    case "mehrere":
      return "Konto gefunden, aber mehrere laufende Buchungen. Bitte auswählen, welche gemeint ist.";
    case "ohne_buchung":
      return "Konto gefunden, aber keine laufende Buchung. Vielleicht ist schon gekündigt.";
    case "kein_konto":
      return "Zu dieser Adresse gibt es kein Konto. Vielleicht hat der Absender mit einer anderen Adresse bestellt.";
    default:
      return "Die Zuordnung wurde noch nicht gesucht.";
  }
}

/* --------------------------------------------------------------- */
/* Die Suche                                                        */
/* --------------------------------------------------------------- */

export type Zuordnung = {
  stand: ZuordnungsStand;
  userId: string | null;
  /** Die laufenden Buchungen dieses Kontos, fuer die Anzeige */
  buchungen: { id: string; leistung_id: string; art: string }[];
};

/**
 * Zu einem Eingang das passende Konto und seine laufenden Buchungen
 * suchen und das Ergebnis an den Eingang schreiben.
 *
 * WIEDERHOLBAR und billig: Sie liest zwei Zeilen und schreibt eine.
 * Wird sie zweimal aufgerufen, steht danach dasselbe da.
 *
 * "LAUFEND" heisst aktiv UND noch nicht gekuendigt. Eine Buchung mit
 * gesetztem gekuendigt_zum ist bereits erledigt und darf den Fall
 * nicht kuenstlich mehrdeutig machen.
 */
export async function kuendigungZuordnen(
  service: SupabaseClient,
  eingang: { id: string; email: string }
): Promise<Zuordnung> {
  const ergebnis = await zuordnungSuchen(service, eingang.email);
  const { error } = await service
    .from("kuendigungs_eingaenge")
    .update({
      zuordnung_user_id: ergebnis.userId,
      zuordnung_stand: ergebnis.stand,
      zuordnung_gesucht_am: new Date().toISOString(),
    })
    .eq("id", eingang.id);
  if (error) {
    /* Kein Drama und kein stiller Ausgang: Die Suche ist eine
       Bequemlichkeit, der Eingang selbst steht ohnehin. Der naechste
       Lauf des Zeitplans versucht es erneut, weil zuordnung_gesucht_am
       dann immer noch leer ist. */
    console.error("[kuendigung] Zuordnung nicht gespeichert:", error.message);
  }
  return ergebnis;
}

async function zuordnungSuchen(
  service: SupabaseClient,
  email: string
): Promise<Zuordnung> {
  const gesucht = email.trim().toLowerCase();
  if (!gesucht) return { stand: "kein_konto", userId: null, buchungen: [] };

  /* Ueber profiles und nicht ueber die Nutzerliste der Anmeldung: Die
     Spalte wird beim Anlegen des Kontos aus auth.users gefuellt
     (Trigger handle_new_user, 0008), ist also dieselbe Adresse, und
     eine Abfrage ist billiger als das Blaettern durch alle Konten. */
  const { data: profil } = await service
    .from("profiles")
    .select("id")
    .ilike("email", gesucht)
    .limit(2)
    .returns<{ id: string }[]>();

  /* Zwei Konten zur selben Adresse kann es nicht geben (auth erzwingt
     das); trifft es doch zu, ist der Fall nicht eindeutig und gehoert
     einem Menschen vorgelegt statt geraten. */
  if (!profil || profil.length !== 1) {
    return { stand: "kein_konto", userId: null, buchungen: [] };
  }
  const userId = profil[0].id;

  const { data: buchungen } = await service
    .from("buchungen")
    .select("id, leistung_id, art")
    .eq("user_id", userId)
    .eq("status", "aktiv")
    .is("gekuendigt_zum", null)
    .returns<{ id: string; leistung_id: string; art: string }[]>();

  const laufend = buchungen ?? [];
  if (laufend.length === 0) return { stand: "ohne_buchung", userId, buchungen: [] };
  if (laufend.length === 1) return { stand: "eindeutig", userId, buchungen: laufend };
  return { stand: "mehrere", userId, buchungen: laufend };
}
