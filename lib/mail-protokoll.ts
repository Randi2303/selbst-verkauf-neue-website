import "server-only";
import { instanzRolle } from "@/lib/instanz";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Jeder Versandversuch der App wird mitgeschrieben, gelungen wie
 * gescheitert.
 *
 * WOZU: Bis hierher liess sich die Frage "wird diese Vorlage im Betrieb
 * ueberhaupt verschickt" nur durch Lesen des Codes beantworten, und
 * genau dabei ist uebersehen worden, dass zwei Vorlagen nirgends
 * ausgeloest werden und die Erinnerung am Vortag nie lief. Mit dem
 * Protokoll beantwortet sich die Frage aus Daten statt aus einer
 * Behauptung.
 *
 * WARUM AUCH DER FEHLSCHLAG "nicht konfiguriert" DRINSTEHT: Sonst
 * saehe ein Rechner ohne RESEND_API_KEY genauso aus wie einer, auf dem
 * der Ausloeser gar nicht greift. Der Eintrag beweist, dass die Stelle
 * erreicht wurde, auch wenn keine Mail rausging.
 *
 * GESCHRIEBEN WIRD MIT DER DIENST-ROLLE. Die meisten Mails loest
 * niemand aus, der angemeldet ist: ein Interessent ohne Konto, oder der
 * Zeitplan mitten in der Nacht. Ein Eintrag darf nie an fehlenden
 * Rechten des Aufrufers scheitern.
 *
 * WIRFT NIE. Ein Protokoll, das eine Handlung zum Scheitern bringt,
 * waere schlimmer als kein Protokoll.
 */
export type MailProtokollEintrag = {
  /** Kennung aus lib/mail-katalog.ts, sonst eine sprechende Bezeichnung */
  vorlage: string;
  empfaenger: string;
  betreff: string;
  erfolg: boolean;
  /** Nur bei erfolg = false, dann aber nie leer */
  grund?: string | null;
  /** Wem der Vorgang gehoert, soweit bekannt */
  userId?: string | null;
  /**
   * Dieser Fehlschlag ist ABSICHT und keine Aufgabe (16.08.2026).
   *
   * Zwei Faelle geben erfolg = false zurueck, ohne dass etwas kaputt
   * ist: ein Rechner ohne Mail-Schluessel und ein Vorfuehrkonto, aus
   * dem nie etwas hinausgeht. Beide gehoeren ins Protokoll, damit man
   * sie unterscheiden kann, aber keiner von beiden gehoert in die
   * Liste der offenen Meldungen. Seit es diese Liste gibt
   * (/admin/meldungen), waere sie sonst nach einer Vorfuehrung so
   * voll, dass die echten Fehlschlaege darin untergehen.
   */
  gewollt?: boolean;
  /**
   * Die Kennung, unter der Resend die angenommene Mail fuehrt
   * (24.08.2026). Nur bei Erfolg gefuellt. Mit ihr laesst sich im
   * Resend-Dashboard der WEITERE Weg der Mail nachschlagen
   * (zugestellt, Ruecklaeufer); genau diese Frage war beim Vorfall
   * vom 24.08.2026 ohne Kennung nicht zu beantworten.
   */
  resendId?: string | null;
};

/**
 * Woher stammt dieser Eintrag? Am 10.08.2026 standen zwei Fehlschlaege
 * vom Entwicklungsrechner im Protokoll des Betriebs, und ihr Grund
 * ("RESEND_API_KEY fehlt") konnte dort gar nicht stimmen. Seitdem
 * traegt jeder NICHT im Betrieb entstandene Grund seine Herkunft im
 * Text; im Betrieb bleibt alles wie gehabt, damit die Ansicht nicht
 * mit einer selbstverstaendlichen Angabe vollsteht.
 */
function mitHerkunft(grund: string | null | undefined): string | null {
  const marke =
    process.env.NODE_ENV === "production" ? null : "[Entwicklungsrechner]";
  if (!marke) return grund ?? null;
  return grund ? `${grund} ${marke}` : marke;
}

export async function mailVermerken(
  eintrag: MailProtokollEintrag
): Promise<void> {
  try {
    const service = supabaseService();
    if (!service) return;
    const zeile = {
      vorlage: eintrag.vorlage,
      empfaenger: eintrag.empfaenger,
      betreff: eintrag.betreff,
      erfolg: eintrag.erfolg,
      grund: eintrag.erfolg ? (eintrag.grund ?? null) : mitHerkunft(eintrag.grund),
      user_id: eintrag.userId ?? null,
    };
    /* WELCHE ANWENDUNG hat den Versuch unternommen (24.08.2026)?
       Seit dem Umzug laeuft derselbe Code zweimal; eine Karte, die
       sagen will, was von wo hinausging, braucht die Herkunft als
       Wert. Spalten aus Migration 0110; solange sie noch nicht
       gelaufen ist, faellt der Eintrag auf die alten Spalten zurueck,
       denn ein Protokoll, das am eigenen Schema scheitert, waere das
       Gegenteil seines Zwecks. */
    // wirkung: gewollt, ein Protokoll, das eine Handlung zum Scheitern bringt, waere schlimmer als kein Protokoll
    const { error } = await service.from("mail_protokoll").insert({
      ...zeile,
      instanz: instanzRolle(),
      resend_id: eintrag.resendId ?? null,
    });
    if (error && /instanz|resend_id/.test(error.message)) {
      // wirkung: gewollt, Rueckfall bis Migration 0110 gelaufen ist
      await service.from("mail_protokoll").insert(zeile);
    }

    /* EIN GESCHEITERTER VERSAND MELDET SICH AUCH NACH DRAUSSEN.
       Das Protokoll allein reicht nicht: Niemand sieht von sich aus in
       eine Liste, die an guten Tagen nichts sagt. Bewusst OHNE
       Empfaengeradresse und ohne Betreff, beides gehoert nicht in
       einen Chat; die Kennung der Vorlage genuegt, um im Admin die
       richtige Zeile zu finden.

       SEIT DEM 16.08.2026 HAT DIESE MELDUNG EINEN LESER: Sie steht
       unter /admin/meldungen mit einem Zustand, der sagt, ob sie
       erledigt ist. Vorher ging sie in ein Protokoll, das keine Seite
       abfragte. Und sie unterscheidet jetzt echte Fehlschlaege von
       gewollten, siehe gewollt oben. */
    if (!eintrag.erfolg && !eintrag.gewollt) {
      const { melde } = await import("@/lib/ereignis");
      await melde({
        ereignis: "mail.fehlgeschlagen",
        empfaenger: { art: "admin" },
        kurztext: `Eine Mail ging nicht raus (${eintrag.vorlage})`,
        /* DIE SCHLEIFENQUELLE: Hier landet JEDER gescheiterte Versand,
           auch der einer Team-Mail. Genau dafuer gibt es den Riegel. */
        betroffeneMailAn: eintrag.empfaenger,
        kennungen: { kunde: eintrag.userId ?? null },
        adminPfad: "/admin/mail-vorlagen",
      });
    }
  } catch (fehler) {
    // wirkung: gewollt, aus demselben Grund wie oben: das Protokoll darf die Handlung nie umwerfen
    console.error("[mail-protokoll] Eintrag fehlgeschlagen:", fehler);
  }
}
