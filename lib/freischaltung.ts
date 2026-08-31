import "server-only";
import { FOTO_AUFBEREITUNG } from "@/config/kontingente";
import { melde } from "@/lib/ereignis";
import { kontingentAnheben } from "@/lib/kontingente";
import { VERLAENGERUNG_LEISTUNG } from "@/lib/laufzeit";
import { supabaseService } from "@/lib/supabase/service";
import { siteConfig } from "@/site.config";
import {
  ausgeblieben,
  gewirkt,
  offenerText,
  zusammen,
  type Wirkung,
} from "@/lib/wirkung";

/**
 * WAS EINE FREIGESCHALTETE BUCHUNG AUSLÖST, an einer Stelle.
 *
 * WARUM ES DIESE DATEI GIBT (Befund vom 13.08.2026): Vier Leistungen
 * standen im Katalog, waren kaufbar, und nach der Zahlung passierte
 * nichts. Die Verlängerung der Portallaufzeit verlängerte nicht, die
 * Notar-Koordination erzeugte keine Aufgabe, die Foto-Aufbereitung
 * hing an einer Umgebungsvariablen statt an der Buchung. Geld nehmen
 * und nichts tun ist der schlimmste dieser Fälle, denn er fällt
 * niemandem auf: Der Kunde denkt, es dauert.
 *
 * ES GIBT DREI WEGE, auf denen eine Buchung aktiv wird (Kasse,
 * Freischaltung von Hand im internen Bereich, Statuswechsel dort).
 * Damit die Wirkung nicht an einem davon hängen bleibt, rufen alle
 * drei DIESE Funktion auf, direkt neben erstelleAuftraegeFuerBuchung.
 * Wer eine vierte Quelle anschließt, ruft sie ebenso auf.
 *
 * WIEDERHOLBAR. Jede Wirkung ist so gebaut, dass ein zweiter Aufruf
 * für dieselbe Buchung nichts verdoppelt: Die Verlängerung merkt sich
 * an der Buchung, dass sie schon gutgeschrieben wurde, das Paket-
 * Kontingent wird auf einen Sockel gehoben statt addiert. Das ist
 * nötig, weil eine Bestellung im Fehlerfall erneut verarbeitet wird.
 *
 * ---------------------------------------------------------------------
 * DER MERKER STEHT ERST, WENN DIE WIRKUNG BELEGT IST (16.08.2026)
 * ---------------------------------------------------------------------
 * BIS HIERHER WAR ES ANDERSHERUM, und das war der schwerste Befund der
 * ganzen Prüfung. Gemessen, zweimal, örtlich und live: Ein Konto ohne
 * Objekt kaufte 178 Euro Verlängerung. Die Bestellung stand auf
 * bezahlt, `freigeschaltet_am` war gesetzt, Bestätigung und Rechnung
 * gingen hinaus, und `schaltung_zusatz_monate` blieb 0. Der Merker war
 * gesetzt worden, ohne dass jemand die Wirkung angesehen hatte.
 *
 * Das Schlimmere war die zweite Hälfte: Beim nächsten Lauf übersprang
 * die Freischaltung den Schritt, WEIL der Merker stand. Der Knopf
 * "Erneut verarbeiten" meldete `{ok:true}` und tat nichts. Ein Kunde,
 * der sich beschwert, hätte zweimal gehört, es sei erledigt.
 *
 * SEITDEM GILT HIER, in dieser Reihenfolge:
 *
 *   1. Jede fällige Wirkung wird ausgeführt und EINZELN GEMESSEN.
 *      Nachweis ist der Rückgabewert der Datenbank-Funktion, nicht die
 *      Tatsache, dass der Aufruf stattgefunden hat.
 *   2. Erst wenn ALLE gemessenen Wirkungen eingetreten sind, wird
 *      `freigeschaltet_am` gesetzt.
 *   3. Bleibt eine aus, bleibt die Buchung OHNE MERKER stehen, der
 *      Grund landet im Klartext in `freischaltung_offen`, und das Team
 *      bekommt eine Meldung. Beides, nicht nur eines davon.
 *   4. Der Aufrufer bekommt das Ergebnis zurück und kann es weiterreichen.
 *      "Erneut verarbeiten" antwortet damit ehrlich, statt `{ok:true}`
 *      über einen Fehlschlag zu legen.
 *
 * JEDER FEHLSCHLAG MELDET, auch der zehnte zum selben Vorgang. Das ist
 * Absicht: Eine bezahlte Buchung ohne Wirkung ist selten, und der
 * Fehler, den wir gerade beheben, war zu WENIG Meldung und nicht zu
 * viel. Wer dieselbe Buchung dreimal erfolglos verarbeitet, soll das
 * dreimal sehen.
 *
 * WIRFT NIE. Ein Fehlschlag darf die Zahlung nicht umwerfen; er steht
 * im Rückgabewert, an der Buchung und in der Meldung.
 */

type Dienst = NonNullable<ReturnType<typeof supabaseService>>;

type BuchungsZeile = {
  id: string;
  user_id: string;
  leistung_id: string;
  art: string;
  menge: number | null;
  freigeschaltet_am: string | null;
  freischaltung_offen: string | null;
  /** Was der Kunde aus dem Paket abgewaehlt hat (0119) */
  abgewaehlt: string[] | null;
};

/**
 * Welche Leistungs-IDs eine Buchung abdeckt, Paket aufgelöst und
 * ABZUEGLICH DER ABWAHL (0119).
 *
 * Ohne den Abzug schaltete diese Stelle eine Leistung frei, die der
 * Kunde abgewaehlt und nicht bezahlt hat. Sie ist damit dieselbe
 * Fundstelle wie abgedeckteLeistungsIds, nur an der Kasse statt in
 * der Anzeige, und deshalb die teurere von beiden.
 */
function abgedeckt(buchung: {
  leistung_id: string;
  art: string;
  abgewaehlt?: string[] | null;
}): string[] {
  if (buchung.art !== "paket") return [buchung.leistung_id];
  const paket = siteConfig.packages.find((p) => p.id === buchung.leistung_id);
  const abgewaehlt = new Set(buchung.abgewaehlt ?? []);
  return (paket?.includedServiceIds ?? [])
    .map((e) => e.id)
    .filter((id) => !abgewaehlt.has(id));
}

/**
 * Eine frisch freigeschaltete Buchung wirksam machen.
 *
 * Gibt zurück, was gewirkt hat und was nicht. Der Aufrufer darf das
 * Ergebnis ignorieren (der Webhook tut es, weil Stripe nicht auf
 * unsere Innereien wartet), aber er kann es nicht mehr NICHT erfahren.
 */
export async function buchungFreischalten(buchungId: string): Promise<Wirkung> {
  let ergebnis: Wirkung;
  try {
    ergebnis = await freischaltenAusfuehren(buchungId);
  } catch (fehler) {
    console.error("[freischaltung] buchungFreischalten:", fehler);
    ergebnis = ausgeblieben(
      `Die Freischaltung ist unerwartet abgebrochen: ${(fehler as Error).message}`
    );
  }
  if (!ergebnis.ok) {
    await melde({
      ereignis: "bestellung.fehler",
      empfaenger: { art: "admin" },
      kurztext:
        "Eine bezahlte Buchung ist nicht wirksam geworden, der Kunde hat sie noch nicht bekommen",
      kennungen: { vorgang: buchungId },
      adminPfad: "/admin/buchungen",
    });
  }
  return ergebnis;
}

async function freischaltenAusfuehren(buchungId: string): Promise<Wirkung> {
  const service = supabaseService();
  if (!service) {
    return ausgeblieben(
      "Der Dienst-Zugang zur Datenbank fehlt, es wurde nichts freigeschaltet."
    );
  }

  const { data: buchung, error } = await service
    .from("buchungen")
    .select(
      "id, user_id, leistung_id, art, menge, freigeschaltet_am, freischaltung_offen, abgewaehlt"
    )
    .eq("id", buchungId)
    .maybeSingle<BuchungsZeile>();
  if (error) {
    return ausgeblieben(`Die Buchung ließ sich nicht laden: ${error.message}`);
  }
  if (!buchung) {
    /* FRÜHER EIN STILLES return. Eine Buchung, die es nicht gibt, ist
       kein Erfolg: Entweder ist die Kennung falsch oder die Zeile ist
       weg, und beides gehört gesagt. */
    return ausgeblieben(
      "Zu dieser Kennung gibt es keine Buchung, es wurde nichts freigeschaltet."
    );
  }

  const ids = abgedeckt(buchung);
  const menge = Math.max(1, buchung.menge ?? 1);
  /* Was NUR EINMAL je Buchung gilt, hängt am Merker. Der Sockel des
     Paket-Kontingents nicht: Er ist von sich aus wiederholbar. */
  const erstmalig = !buchung.freigeschaltet_am;

  const teile: Wirkung[] = [];

  // 1) ZUSÄTZLICHE MONATE PORTALSCHALTUNG
  if (ids.includes(VERLAENGERUNG_LEISTUNG) && erstmalig) {
    teile.push(await verlaengereSchaltung(service, buchung.user_id, menge));
  }

  /* 2) DAS KONTINGENT FÜR DIE FOTO-AUFBEREITUNG.
     Im Paket enthalten heißt: auf den Sockel heben, wiederholbar.
     Dazugekauft heißt: addieren, und deshalb nur einmal je Buchung. */
  if (ids.includes(FOTO_AUFBEREITUNG.enthaltenMit)) {
    const neu = await kontingentAnheben(
      service,
      buchung.user_id,
      "foto_verbesserungen",
      FOTO_AUFBEREITUNG.inklusive,
      "mindestens"
    );
    /* NACHWEIS: Nach einem Sockel muss der Stand mindestens so hoch
       sein. Ein kleinerer Wert wäre ein Fehler der Datenbank-Funktion
       und keine gültige Antwort. */
    teile.push(
      neu !== null && neu >= FOTO_AUFBEREITUNG.inklusive
        ? gewirkt(
            `Kontingent für Foto-Aufbereitung steht auf mindestens ${FOTO_AUFBEREITUNG.inklusive} (jetzt ${neu}).`
          )
        : ausgeblieben(
            `Das im Paket enthaltene Kontingent von ${FOTO_AUFBEREITUNG.inklusive} Foto-Aufbereitungen ist nicht gesetzt worden` +
              (neu === null ? "." : ` (Stand ${neu}).`) +
              " Bitte im internen Bereich beim Kunden nachtragen."
          )
    );
  }

  if (ids.includes(FOTO_AUFBEREITUNG.leistungId) && erstmalig) {
    const anzahl = FOTO_AUFBEREITUNG.jeEinheit * menge;
    const neu = await kontingentAnheben(
      service,
      buchung.user_id,
      "foto_verbesserungen",
      anzahl,
      "erhoehen"
    );
    /* NACHWEIS: der neue Stand. Nicht auf "alt plus anzahl" prüfen:
       Eine gleichzeitige zweite Freischaltung darf mitzählen, und
       dann wäre der Wert höher, ohne dass etwas falsch ist. */
    teile.push(
      neu !== null
        ? gewirkt(`${anzahl} Foto-Aufbereitungen gutgeschrieben (Stand ${neu}).`)
        : ausgeblieben(
            `Die ${anzahl} dazugekauften Foto-Aufbereitungen sind nicht gutgeschrieben worden. Bitte im internen Bereich beim Kunden nachtragen.`
          )
    );
  }

  const wirkung = zusammen(teile);

  /* 3) DER MERKER, ZULETZT UND NUR BEI NACHGEWIESENER WIRKUNG. */
  if (wirkung.ok && erstmalig) {
    const { data: gesetzt, error: merkerFehler } = await service
      .from("buchungen")
      .update({ freigeschaltet_am: new Date().toISOString(), freischaltung_offen: null })
      .eq("id", buchung.id)
      .select("id");
    if (merkerFehler || (gesetzt?.length ?? 0) === 0) {
      /* DER UNANGENEHMSTE FALL: Die Wirkung ist eingetreten, der Merker
         nicht. Ein weiterer Lauf würde sie ein zweites Mal gutschreiben.
         Deshalb steht hier ausdrücklich, was ein Mensch wissen muss,
         bevor er den Knopf noch einmal drückt. */
      return {
        ok: false,
        gewirkt: wirkung.gewirkt,
        offen: [
          `ACHTUNG: Die Wirkung ist eingetreten, aber der Merker "freigeschaltet_am" ließ sich nicht setzen${merkerFehler ? ` (${merkerFehler.message})` : ""}. NICHT erneut verarbeiten, ohne vorher nachzusehen, sonst wird die Leistung doppelt gutgeschrieben.`,
        ],
      };
    }
    return wirkung;
  }

  /* 4) FEHLGESCHLAGEN ODER SCHON FREIGESCHALTET: den Stand an die
     Buchung schreiben, damit im internen Bereich nicht eine bezahlte
     Buchung ohne jede Erklärung steht. Ein späterer erfolgreicher Lauf
     räumt den Text wieder weg. */
  const offen = offenerText(wirkung);
  if (offen !== buchung.freischaltung_offen) {
    const { error: standFehler } = await service
      .from("buchungen")
      .update({ freischaltung_offen: offen })
      .eq("id", buchung.id);
    if (standFehler) {
      console.error("[freischaltung] Stand nicht gespeichert:", standFehler.message);
    }
  }
  return wirkung;
}

/**
 * Die Schaltung des Objekts um Monate verlängern.
 *
 * ADDIERT AUF DEN BISHERIGEN STAND, nicht auf das heutige Datum. Wer
 * drei Wochen vor Ablauf verlängert, hat diese drei Wochen bezahlt und
 * behält sie. Das Ende selbst bleibt eine Herleitung aus der
 * Veröffentlichung (lib/laufzeit.ts); hier wächst nur der Summand.
 *
 * ÜBER EINE DATENBANK-FUNKTION (0077), aus zwei Gründen: Lesen,
 * Rechnen, Schreiben ließ sich von einer zweiten Freischaltung
 * desselben Kontos überholen, und der Aufrufer bekommt jetzt den NEUEN
 * STAND als Nachweis. Der ist der ganze Unterschied zu vorher.
 *
 * KEIN OBJEKT IST EIN FEHLSCHLAG, kein Sonderfall. Hier stand bis zum
 * 16.08.2026 der Kommentar "Kein stiller Ausgang: Die Buchung bleibt
 * ohne Merker stehen und wirkt beim nächsten Aufruf". Das war das
 * Gegenteil dessen, was der Kode tat: Der Merker wurde anschließend
 * doch gesetzt, und der nächste Aufruf übersprang die Verlängerung.
 * Jetzt stimmt der Satz, weil der Fehlschlag nach oben durchschlägt.
 */
async function verlaengereSchaltung(
  service: Dienst,
  userId: string,
  monate: number
): Promise<Wirkung> {
  const { data, error } = await service.rpc("schaltung_verlaengern", {
    p_user: userId,
    p_monate: monate,
  });
  if (error) {
    console.error("[freischaltung] Verlängerung nicht gespeichert:", error.message);
    return ausgeblieben(
      `Die ${monate} zusätzlich bezahlten Monate Portalschaltung sind nicht gutgeschrieben worden (${error.message}).`
    );
  }
  if (typeof data !== "number") {
    /* null heißt: kein Objekt. Der Kunde hat bezahlt, es gibt nur noch
       nichts zu verlängern. Die Buchung bleibt deshalb ohne Merker
       stehen und wirkt, sobald das Objekt da ist und jemand die
       Freischaltung erneut auslöst. */
    console.warn("[freischaltung] Verlängerung ohne Objekt, Konto", userId);
    return ausgeblieben(
      `Die ${monate} bezahlten Monate Portalschaltung warten: Zu diesem Konto gibt es noch kein Objekt. Sobald es erfasst ist, "Erneut freischalten" drücken, dann werden sie gutgeschrieben.`
    );
  }
  return gewirkt(
    `Portalschaltung um ${monate} Monat${monate === 1 ? "" : "e"} verlängert (Zusatz jetzt ${data}).`
  );
}
