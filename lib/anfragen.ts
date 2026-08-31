import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { herkunftSatz } from "@/config/portale";
import { meldeFuerKunden } from "@/lib/ereignis";
import { sendeExposeLink } from "@/lib/expose-link";
import { sendeHinweis } from "@/lib/benachrichtigung";
import { anfragenEmpfangSteht } from "@/lib/mail";
import { neueAnfrageMail } from "@/lib/mail-vorlagen";
import { supabaseService } from "@/lib/supabase/service";
import { meldeDemKunden } from "@/lib/kunden-meldung";

/**
 * DER EINE WEG, auf dem eine Anfrage entsteht.
 *
 * WARUM ES DIESE DATEI GIBT (Befund vom 13.08.2026): Anfragen wurden an
 * drei Stellen angelegt, und jede tat etwas anderes. Die Objektseite
 * meldete dem Team, der Portal-Import meldete dem Makler, und das
 * Pruef-Werkzeug meldete gar nichts. Den KUNDEN, dem die Anfrage
 * gehoert, erreichte auf keinem der drei Wege etwas.
 *
 * Das ist genau der Fehler, den man vor dem Start nicht findet: Wer mit
 * dem Werkzeug prueft, prueft den kuerzesten der drei Wege und haelt
 * das Schweigen fuer richtig.
 *
 * Seitdem laeuft jede Anfrage durch anfrageAnlegen(). Wer kuenftig eine
 * vierte Quelle anschliesst (ein Portal-Postfach etwa), ruft diese
 * Funktion auf und ist damit automatisch in Akte, Meldung und
 * Kunden-Benachrichtigung.
 *
 * REIHENFOLGE, mit Absicht:
 * 1. Zeile anlegen. Der Trigger aus 0043 macht daraus die Akte.
 * 2. Expose-Link, falls am Objekt eingeschaltet.
 * 3. Den KUNDEN benachrichtigen (Mail nach seinen Einstellungen). Die
 *    Markierung in der Navigation braucht nichts davon: Sie zaehlt
 *    ungelesene Anfragen und ist damit immer richtig, auch wenn eine
 *    Mail abbestellt oder gescheitert ist.
 * 4. Das TEAM melden (Makler mit Rueckfall auf den Admin).
 *
 * Kein Schritt darf den vorherigen umwerfen: Eine gescheiterte Mail
 * loescht keine Anfrage.
 */

export type NeueAnfrage = {
  objektId: string;
  userId: string;
  /**
   * Woher sie kam. Steht spaeter in der Akte als Herkunft. null nur,
   * wenn ein Portal-Import den Absender nicht nennt; dann bleibt die
   * Herkunft leer statt geraten zu werden.
   */
  portal: string | null;
  vorname?: string | null;
  nachname?: string | null;
  firma?: string | null;
  anrede?: string | null;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  email?: string | null;
  telefon?: string | null;
  mobil?: string | null;
  nachricht?: string | null;
  wuensche?: string[] | null;
  /** Liste aus dem OpenImmo-Feedback (Telefon, E-Mail, Post) */
  bevorzugter_kontakt?: string[] | null;
  portal_objekt_id?: string | null;
  /** interessent > int_id: die Kennung der Person beim Portal */
  portal_interessent_id?: string | null;
  /* ---------------- Nur aus dem Portal-Einleser (0062) ------------- */
  /** objekt > expose_url: das Inserat, auf dem die Person das Haus fand */
  exposeUrl?: string | null;
  /**
   * Die aus dem Anfragetext geloeste Selbstauskunft. Sie steht
   * bewusst NICHT in nachricht: Was nachricht liest, gibt sie sonst
   * weiter, und der Antwortvorschlag liest nachricht.
   */
  selbstauskunft?: { feld: string; label: string; wert: string; schutz: boolean }[] | null;
  /** false: Die Datei war nicht sauber lesbar, nachricht traegt den Rohtext */
  erkennungVollstaendig?: boolean;
  /** Was unklar blieb, in Saetzen fuer den Kunden */
  erkennungHinweise?: string[] | null;
  /** Die Adresse gehoert dem Portal, nicht der Person */
  emailAlias?: boolean;
  /** Die Zeile in portal_eingaenge, aus der diese Anfrage stammt */
  eingangId?: string | null;
};

export type AnfrageErgebnis = { id: string } | { fehler: string };

/**
 * Wie eine Anfrage in der Benachrichtigung heisst. BEWUSST OHNE NAMEN
 * und ohne den Text: In einer Telegram-Nachricht haben die Daten eines
 * Dritten nichts zu suchen. Das Portal darf drinstehen, es steht
 * ohnehin in jeder Anzeige.
 */
function herkunftText(portal: string | null): string {
  /* EINE Formulierung fuer alle Kanaele (config/portale.ts): vorher
     stand hier die rohe Kennung, also "ueber immoscout24". */
  return herkunftSatz(portal);
}

export async function anfrageAnlegen(
  eingabe: NeueAnfrage,
  optionen: {
    /**
     * Expose-Link automatisch verschicken, wenn er am Objekt
     * eingeschaltet ist. Der Portal-Import laesst das aus, dort
     * entscheidet der Import-Lauf.
     */
    exposeAuto?: boolean;
    /**
     * Zeile und Akte ja, Mails und Team-Meldung nein. NUR fuer die
     * Notbremse der oeffentlichen Anfrage (lib/bremse.ts,
     * jeObjekt24h): Ab einer Tagesmenge je Objekt wuerde jede
     * weitere Mail das Postfach des Verkaeufers unbrauchbar machen,
     * die Anfragen selbst sollen aber nicht verloren gehen. Der
     * Posteingang und der Zaehler in der Navigation zaehlen Zeilen
     * und stimmen deshalb weiter.
     */
    stumm?: boolean;
    /** Eigener Dienst-Client, sonst wird einer geholt */
    service?: SupabaseClient | null;
  } = {}
): Promise<AnfrageErgebnis> {
  const service = optionen.service ?? supabaseService();
  if (!service) return { fehler: "Dienste sind nicht eingerichtet." };

  const { data: anfrage, error } = await service
    .from("anfragen")
    .insert({
      objekt_id: eingabe.objektId,
      user_id: eingabe.userId,
      portal: eingabe.portal,
      anrede: eingabe.anrede ?? null,
      vorname: eingabe.vorname ?? null,
      nachname: eingabe.nachname ?? null,
      firma: eingabe.firma ?? null,
      strasse: eingabe.strasse ?? null,
      plz: eingabe.plz ?? null,
      ort: eingabe.ort ?? null,
      email: eingabe.email ?? null,
      telefon: eingabe.telefon ?? null,
      mobil: eingabe.mobil ?? null,
      nachricht: eingabe.nachricht ?? null,
      wuensche: eingabe.wuensche ?? ["DETAIL"],
      /* Beide Listen-Spalten sind NICHT NULL mit Vorgabe '[]'. Ein
         ausdrückliches null bricht deshalb (belegt am 13.08.2026, die
         Prüfanfrage lief in genau diesen Fehler). */
      bevorzugter_kontakt: eingabe.bevorzugter_kontakt ?? [],
      portal_objekt_id: eingabe.portal_objekt_id ?? null,
      /* Wird nie angezeigt. Sie traegt seit 0062 das Erkennen von
         Doppelungen, wenn ein Portal eine Alias-Adresse statt der
         echten zustellt: Der Trigger prueft sie VOR der E-Mail. */
      portal_interessent_id: eingabe.portal_interessent_id ?? null,
      expose_url: eingabe.exposeUrl ?? null,
      selbstauskunft: eingabe.selbstauskunft ?? [],
      erkennung_vollstaendig: eingabe.erkennungVollstaendig ?? true,
      erkennung_hinweise: eingabe.erkennungHinweise ?? [],
      email_alias: eingabe.emailAlias ?? false,
      eingang_id: eingabe.eingangId ?? null,
    })
    /* interessent_id kommt MIT ZURÜCK: Sie wird von einem Trigger
       gesetzt (eine Person, eine Unterhaltung), und die Hinweis-Mail
       an den Verkäufer führt damit direkt in diese Unterhaltung statt
       nur in den Posteingang. */
    .select("id, interessent_id")
    .single<{ id: string; interessent_id: string | null }>();
  if (error || !anfrage) {
    console.error("[anfragen] Anlegen fehlgeschlagen:", error?.message);
    return { fehler: error?.message ?? "Die Anfrage ließ sich nicht anlegen." };
  }

  /* Die Notbremse: Zeile und Akte stehen, mehr passiert nicht. Auch
     kein Expose-Versand, denn der ist ebenfalls eine Mail. */
  if (optionen.stumm) {
    return { id: anfrage.id };
  }

  /* Der automatische Expose-Versand. Ein Fehlschlag (etwa ohne
     erzeugtes PDF) laesst die Anfrage unberuehrt; der Verkaeufer sieht
     sie und kann aus der Akte senden. */
  if (optionen.exposeAuto) {
    const { data: objekt } = await service
      .from("objekte")
      .select("expose_auto_versand")
      .eq("id", eingabe.objektId)
      .maybeSingle<{ expose_auto_versand: boolean }>();
    if (objekt?.expose_auto_versand) {
      await sendeExposeLink({ anfrageId: anfrage.id, erstelltVon: null });
    }
  }

  /* DER KUNDE ZUERST. Er ist der Mensch, der auf diese Anfrage
     antworten muss; das Team schaut nur zu. */
  const name = [eingabe.vorname, eingabe.nachname].filter(Boolean).join(" ").trim();
  await sendeHinweis(service, eingabe.userId, "anfrage-eingegangen", (empfaenger) =>
    neueAnfrageMail({
      name: empfaenger.name,
      interessentName: name || null,
      interessentId: anfrage.interessent_id,
      empfangSteht: anfragenEmpfangSteht(),
      portal: eingabe.portal,
      nachricht: eingabe.nachricht ?? null,
    })
  );

  /* UND IN SEINE GLOCKE (Runde 35). Die Mail gibt es seit langem; sie
     erreicht ihn aber nicht, wenn er Hinweise abbestellt hat. KEIN
     NAME und KEINE Nachricht in der Zeile: Nur, WOHER die Anfrage
     kommt. Wer sie geschrieben hat, steht im Posteingang. */
  /* herkunftText beginnt selbst mit "ueber ..." (herkunftSatz in
     config/portale.ts). Bis zum 31.08.2026 stand hier "Über ${...}",
     und die Zeile las sich "Über über ImmoScout24." Deshalb nur den
     ersten Buchstaben heben, nichts davorstellen. */
  const herkunftZeile = herkunftText(eingabe.portal);
  await meldeDemKunden({
    kundeId: eingabe.userId,
    art: "anfrage.eingegangen",
    zeile: `${herkunftZeile.charAt(0).toUpperCase()}${herkunftZeile.slice(1)}. Im Posteingang können Sie direkt antworten.`,
    kennungen: { anfrage: anfrage.id },
  });

  await meldeFuerKunden(eingabe.userId, {
    ereignis: "anfrage.eingegangen",
    kurztext: `Eine Anfrage ist eingegangen (${herkunftText(eingabe.portal)})`,
    kennungen: { kunde: eingabe.userId, objekt: eingabe.objektId, vorgang: anfrage.id },
    adminPfad: "/admin/anfragen",
  });

  return { id: anfrage.id };
}
