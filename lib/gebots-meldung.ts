import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { empfaengerFuerHinweis } from "@/lib/benachrichtigung";
import { sendeMail } from "@/lib/mail";
import { neuesGebotMail } from "@/lib/mail-vorlagen";
import { meldeDemKunden } from "@/lib/kunden-meldung";
import { melde, NICHT_DAS_TEAM_POSTFACH} from "@/lib/ereignis";
import { schreibe } from "@/lib/schreiben";

/**
 * Der Verkaeufer erfaehrt von einem neuen Gebot.
 *
 * DER BEFUND, der dazu gefuehrt hat: Die Vorlage gab es seit dem Bau
 * des Bieterverfahrens, ausgeloest wurde sie nie. Der Verkaeufer erfuhr
 * von einem Gebot nur, wenn er die Seite zufaellig offen hatte. Genau
 * das ist der Fall, den eine Benachrichtigung abdecken soll: Sie geht
 * an jemanden, der gerade NICHT hinschaut.
 *
 * DIE DAEMPFUNG, und warum sie so aussieht:
 *
 * Bei einem gefragten Objekt koennen in kurzer Zeit mehrere Gebote
 * eingehen. Zehn Mails in fuenf Minuten helfen niemandem, und wer sie
 * daraufhin abschaltet, bekommt danach auch die wichtigen nicht mehr.
 *
 * Erwogen und verworfen:
 *
 * 1. Jedes Gebot sofort. Ehrlich, aber im Ernstfall eine Flut.
 * 2. Alles sammeln und erst nach einer Wartezeit schicken. Damit
 *    verzoegert sich auch die ERSTE Mail, und die ist die wichtigste:
 *    Sie sagt dem Verkaeufer, dass sein Inserat wirkt. Diesen Moment um
 *    eine halbe Stunde zu verschieben, waere der falsche Tausch.
 *
 * Gewaehlt: Das erste Gebot geht sofort raus. Danach gilt eine
 * Ruhezeit. Was in ihr eingeht, wird nur gezaehlt, und der Zeitplan
 * schickt eine einzige Sammelmeldung hinterher. Der Verkaeufer erfaehrt
 * also sofort, DASS es losgeht, und danach in Ruhe, wie viel dazukam.
 *
 * Der Verkaeufer kann die Mail im Zahnrad an der Glocke abschalten,
 * denn sie laeuft ueber dieselbe Mechanik wie jeder andere Hinweis
 * (empfaengerFuerHinweis, seit dem 30.08.2026 je Thema). Das Thema
 * heisst "neues-gebot" und umfasst auch die Sammelmeldung; wer das
 * eine abbestellt, bekommt auch das andere nicht.
 */

/**
 * Wie lange nach einer Gebotsmail Ruhe herrscht.
 *
 * 30 Minuten: kurz genug, dass die Sammelmeldung noch am selben
 * Vormittag ankommt, lang genug, dass eine Welle von Geboten in einer
 * einzigen Mail landet. Der Wert steht hier und nicht verstreut im
 * Code, damit er sich an einer Stelle aendern laesst.
 */
export const RUHEZEIT_MINUTEN = 30;

export type GebotsVerfahren = {
  id: string;
  user_id: string;
  gebots_mail_zuletzt_am: string | null;
};

/** Liegt die letzte Gebotsmail noch innerhalb der Ruhezeit? */
export function inRuhezeit(
  zuletzt: string | null,
  jetzt: Date = new Date()
): boolean {
  if (!zuletzt) return false;
  return jetzt.getTime() - new Date(zuletzt).getTime() < RUHEZEIT_MINUTEN * 60_000;
}

/**
 * Nach dem Speichern eines Gebots aufrufen.
 *
 * WIRFT NIE und blockiert nichts. Ein Gebot ist gespeichert, auch wenn
 * die Mail nicht rausgeht; der Bieter darf davon nichts merken. Der
 * Fehlschlag steht im Versandprotokoll.
 *
 * Gibt zurueck, was passiert ist, damit die Route es im Server-Log
 * vermerken kann. Die Antwort an den Bieter haengt NICHT davon ab.
 */
export async function gebotGemeldet({
  service,
  verfahren,
  betrag,
  anzahlGesamt,
}: {
  service: SupabaseClient | null;
  verfahren: GebotsVerfahren;
  /** Der Betrag des gerade eingegangenen Gebots */
  betrag: number;
  /** Wie viele Gebote in dieser Runde jetzt vorliegen */
  anzahlGesamt: number;
}): Promise<"sofort" | "gesammelt" | "abbestellt" | "fehler"> {
  try {
    if (!service) return "fehler";

    if (inRuhezeit(verfahren.gebots_mail_zuletzt_am)) {
      // Nur vormerken. Den Rest erledigt der Zeitplan.
      await service.rpc("gebot_mail_vormerken", { p_verfahren: verfahren.id });
      return "gesammelt";
    }

    // Moechte der Verkaeufer solche Hinweise ueberhaupt?
    const empfaenger = await empfaengerFuerHinweis(service, verfahren.user_id, "neues-gebot");
    if (!empfaenger) {
      // Abbestellt oder Versand nicht eingerichtet. In beiden Faellen
      // trotzdem die Ruhezeit setzen waere falsch: Sonst zaehlte der
      // Zeitplan spaeter Gebote fuer eine Mail, die nie kommt.
      return "abbestellt";
    }

    const mail = neuesGebotMail({
      name: empfaenger.name,
      betrag,
      anzahl: anzahlGesamt,
    });
    await sendeMail({
      an: empfaenger.email,
      betreff: mail.betreff,
      html: mail.html,
      text: mail.text,
      art: "benachrichtigung",
      vorlage: "neues-gebot",
      userId: verfahren.user_id,
    });

    /* IN DIE GLOCKE (Runde 35). OHNE DEN BETRAG und ohne den Namen des
       Bieters: Beides steht im Bieterverfahren, wo der Rahmen es
       erklaert. Eine Zeile, die "340.000 Euro" auf einem
       Sperrbildschirm zeigt, ist genau das, was der Katalog
       ausschliesst. Die Art sammelt eine Stunde; in den letzten
       Stunden einer Frist kommen Gebote in Schueben. */
    await meldeDemKunden({
      kundeId: verfahren.user_id,
      art: "gebot.eingegangen",
      zeile:
        anzahlGesamt === 1
          ? "Für Ihr Objekt liegt ein Gebot vor. Die Höhe sehen Sie im Bieterverfahren."
          : `Für Ihr Objekt liegen inzwischen ${anzahlGesamt} Gebote vor. Die Höhen sehen Sie im Bieterverfahren.`,
      kennungen: { verfahren: verfahren.id },
    });

    // Die Ruhezeit beginnt mit dem VERSUCH, nicht mit dem Erfolg. Sonst
    // erzeugt eine klemmende Mail-Anbindung bei jedem Gebot einen neuen
    // Versuch und flutet das Protokoll.
    /* DIESER MERKER IST DIE RUHEZEIT SELBST (31.08.2026 abgesichert).
       Sitzt er nicht, beginnt beim naechsten Gebot keine Ruhezeit, und
       der Verkaeufer bekommt eine Mail JE GEBOT statt einer je
       Ruhezeit. In einem laufenden Bieterverfahren koennen das viele
       sein, und es trifft ihn genau dann, wenn ohnehin Betrieb ist. */
    const ruhezeit = await schreibe(
      service
        .from("bieterverfahren")
        .update({ gebots_mail_zuletzt_am: new Date().toISOString() })
        .eq("id", verfahren.id)
        .select("id")
    );
    if (!ruhezeit.ok) {
      console.error(
        "[gebots-meldung] Ruhezeit nicht vermerkt:",
        ruhezeit.fehler ?? "null Zeilen"
      );
      await melde({
        ereignis: "mail.fehlgeschlagen",
        empfaenger: { art: "admin" },
        kurztext:
          `Die Ruhezeit der Gebots-Mail wurde nicht vermerkt (${ruhezeit.fehler ?? "null Zeilen ohne Fehler"}). ` +
          `Ohne sie geht beim naechsten Gebot erneut eine Mail an den Verkaeufer.`,
                /* Die Gebots-Mail ging HINAUS; nur die Ruhezeit fehlt. */
        betroffeneMailAn: NICHT_DAS_TEAM_POSTFACH,
kennungen: { vorgang: verfahren.id },
        adminPfad: "/admin/bieterverfahren",
      });
    }

    return "sofort";
  } catch (fehler) {
    console.error("[gebots-meldung] fehlgeschlagen:", fehler);
    return "fehler";
  }
}
