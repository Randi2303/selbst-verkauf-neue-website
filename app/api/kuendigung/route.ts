import { NextResponse } from "next/server";
import {
  bremsSchluessel,
  bremseVoll,
  GRENZEN,
  klientAdresse,
} from "@/lib/bremse";
import { melde, NICHT_DAS_TEAM_POSTFACH} from "@/lib/ereignis";
import { schreibe } from "@/lib/schreiben";
import { kuendigungZuordnen } from "@/lib/kuendigungen";
import { sendeMail } from "@/lib/mail";
import { kuendigungEingangMail } from "@/lib/mail-vorlagen";
import { supabaseService } from "@/lib/supabase/service";
import { siteConfig } from "@/site.config";
import { pflichtMail } from "@/config/pflicht-mails";

export const dynamic = "force-dynamic";

/**
 * Die oeffentliche Kuendigungs-Stelle (/kuendigen).
 *
 * OHNE ANMELDUNG, mit Absicht: Das Gesetz verlangt fuer laufende
 * Vertraege einen Kuendigungsweg ohne Huerden. Deshalb gilt hier:
 *
 * 1. Die Erklaerung wird UNVERAENDERT festgehalten, mit Zeitpunkt.
 * 2. Die Empfangsbestaetigung geht in Textform an die angegebene
 *    Adresse, mit Datum und Uhrzeit.
 * 3. Die WIRKUNG (gekuendigt_zum an der Buchung) traegt das Team nach
 *    ZUORDNUNG ein. Eine anonyme Eingabe beendet nie automatisch
 *    fremde Vertraege, sonst koennte jeder mit einer geratenen
 *    E-Mail-Adresse kuendigen.
 *
 * Das Ergebnis des Speicherns wird geprueft, nicht angenommen: Eine
 * Kuendigung, deren Eingang bestaetigt, aber nie gespeichert wurde,
 * waere der schlimmste Fall dieser Seite.
 */
export async function POST(request: Request) {
  const service = supabaseService();
  if (!service) {
    return NextResponse.json({ meldung: "Gerade nicht möglich." }, { status: 503 });
  }

  const daten = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    leistung?: string;
    zum_wunsch?: string;
    nachricht?: string | null;
  } | null;

  const name = String(daten?.name ?? "").trim().slice(0, 200);
  const email = String(daten?.email ?? "").trim().toLowerCase().slice(0, 200);
  const leistung = String(daten?.leistung ?? "").trim().slice(0, 200);
  const zumWunsch = String(daten?.zum_wunsch ?? "frühestmöglich").trim().slice(0, 100);
  const nachricht = daten?.nachricht ? String(daten.nachricht).trim().slice(0, 2000) : null;

  if (!name || !leistung || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { meldung: "Bitte geben Sie Name, E-Mail-Adresse und die Leistung an." },
      { status: 400 }
    );
  }

  /* DIE GRENZE, seit Bau-Runde 6 (17.08.2026): Jede Absendung erzeugt
     eine Zeile, eine Empfangsbestaetigung an eine frei waehlbare
     Adresse und eine Team-Meldung, ohne Anmeldung. Zwei Schichten:
     je E-Mail und Tag (gezaehlt an den gespeicherten Eingaengen,
     ueberlebt Neustarts) und je Anschluss und Stunde (lib/bremse.ts).

     DER SATZ NENNT DEN AUSWEICH-WEG. Eine Kuendigung nach § 312k darf
     nie versperrt sein; wer hier anstoesst, erfaehrt, wohin er seine
     Erklaerung stattdessen schickt, und dass ihm daraus kein Nachteil
     entsteht. Zahlen, Fenster oder Zeitpunkte nennt er nicht. */
  const ausweich = `Das Formular kann Ihre Erklärung gerade nicht entgegennehmen. Bitte senden Sie Ihre Kündigung per E-Mail an ${siteConfig.contact.email}. Für den Zeitpunkt zählt der Zugang Ihrer E-Mail, Ihnen entsteht kein Nachteil.`;
  const adresse = klientAdresse(request);
  if (
    adresse &&
    bremseVoll(bremsSchluessel("kuendigung-ip", adresse), GRENZEN.kuendigung.jeAdresseStunde)
  ) {
    return NextResponse.json({ meldung: ausweich }, { status: 429 });
  }
  const seit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: heuteSchon } = await service
    .from("kuendigungs_eingaenge")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("eingegangen_am", seit);
  if ((heuteSchon ?? 0) >= GRENZEN.kuendigung.jeEmail24h) {
    return NextResponse.json({ meldung: ausweich }, { status: 429 });
  }

  const { data: eingang, error } = await service
    .from("kuendigungs_eingaenge")
    .insert({
      name,
      email,
      leistung,
      zum_wunsch: zumWunsch,
      nachricht,
    })
    .select("id, eingegangen_am")
    .single<{ id: string; eingegangen_am: string }>();
  if (error || !eingang) {
    console.error("[kuendigung-eingang] Speichern fehlgeschlagen:", error?.message);
    return NextResponse.json(
      {
        meldung:
          "Ihre Kündigung ließ sich gerade nicht speichern. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt.",
      },
      { status: 500 }
    );
  }

  /* Empfangsbestaetigung in Textform. Ein Mail-Fehlschlag macht den
     Eingang nicht ungueltig, er steht im Versandprotokoll.

     ABER ER DARF NICHT UNTERGEHEN (16.08.2026). Die Bestaetigung ist
     gesetzlich geschuldet; bleibt sie aus, hat der Absender keinen
     Beleg fuer seine Kuendigung. Bis heute wurde das Ergebnis von
     sendeMail hier gar nicht angesehen, und mail_protokoll.erfolg
     liest im ganzen Projekt niemand. Also: Nachweis an den Eingang,
     und wenn er fehlt, eine Aufgabe fuer das Team. Der Zeitplan holt
     die Bestaetigung beim naechsten Lauf nach. */
  /* DIE ZUORDNUNG LAEUFT VOR DER MAIL (24.08.2026): Sie liefert den
     Eigentuemer des Vorgangs, an dem der Vorfuehr-Riegel in
     sendeMail() haengt. Ohne sie ginge die Bestaetigung einer
     Vorfuehr-Kuendigung echt hinaus. Sie ist wiederholbar und billig;
     ein Fehlschlag laesst die Mail nicht ausfallen, denn die
     Bestaetigung ist gesetzlich geschuldet, dann eben mit
     ausdruecklicher Begruendung statt Eigentuemer. */
  const zuordnung = await kuendigungZuordnen(service, {
    id: eingang.id,
    email,
  }).catch((fehler) => {
    /* wirkung: gewollt still gegenueber dem Menschen, und der Grund
       steht schon im Block darueber: Die Bestaetigung einer Kuendigung
       ist gesetzlich geschuldet und geht in JEDEM Fall hinaus, dann
       eben mit ausdruecklicher Begruendung statt mit dem Eigentuemer.
       Ein Abbruch hier hielte genau die Mail auf, die nicht ausfallen
       darf. Das Team sieht den Fehlschlag im Server-Protokoll und die
       nicht zugeordnete Kuendigung in seiner Liste. */
    console.error("[kuendigung-eingang] Zuordnung:", fehler);
    return null;
  });

  const mail = kuendigungEingangMail({
    name,
    leistung,
    zumWunsch,
    eingegangenAm: eingang.eingegangen_am,
  });
  const bestaetigt = await sendeMail({
    an: email,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: pflichtMail("kuendigung-eingang"),
    ...(zuordnung?.userId
      ? { userId: zuordnung.userId }
      : {
          ohneEigentuemer: {
            grund:
              "Oeffentliche Kuendigungsstelle: kein Konto zur Adresse gefunden, die Empfangsbestaetigung ist gesetzlich geschuldet",
          },
        }),
  });
  if (bestaetigt) {
    /* DER MERKER GEGEN DIE ZWEITE BESTAETIGUNG (31.08.2026
       abgesichert). Der Zeitplan in lib/auftrag-jobs.ts holt jede
       Kuendigung nach, deren `bestaetigung_verschickt_am` leer ist.
       Sitzt der Merker nicht, schickt er dieselbe Bestaetigung bei
       jedem Lauf erneut, und der Kunde bekommt sie ein zweites und
       drittes Mal. Bei einer Kuendigung ist das besonders unangenehm:
       Jede Mail liest sich wie ein neuer Vorgang. */
    const merker = await schreibe(
      service
        .from("kuendigungs_eingaenge")
        .update({ bestaetigung_verschickt_am: new Date().toISOString() })
        .eq("id", eingang.id)
        .select("id")
    );
    if (!merker.ok) {
      console.error(
        "[kuendigung] Bestaetigungs-Merker nicht gesetzt:",
        merker.fehler ?? "null Zeilen"
      );
      await melde({
        ereignis: "mail.fehlgeschlagen",
        empfaenger: { art: "admin" },
        kurztext:
          `Die Kuendigungsbestaetigung wurde verschickt, aber nicht vermerkt ` +
          `(${merker.fehler ?? "null Zeilen ohne Fehler"}). Der Zeitplan wird sie erneut schicken.`,
                /* Die Bestaetigung ging HINAUS; nur der Merker fehlt. */
        betroffeneMailAn: NICHT_DAS_TEAM_POSTFACH,
kennungen: { vorgang: eingang.id },
        adminPfad: "/admin/kuendigungen",
      });
    }
  } else {
    await melde({
      ereignis: "mail.fehlgeschlagen",
      empfaenger: { art: "admin" },
      kurztext:
        "Die Eingangsbestätigung einer Kündigung ließ sich nicht versenden. Sie ist gesetzlich geschuldet, bitte nachholen.",
      betroffeneMailAn: email,
      kennungen: { vorgang: eingang.id },
      adminPfad: "/admin/buchungen",
    });
  }

  /* Die Zuordnung ist bereits VOR der Mail gelaufen (siehe oben), der
     Eingang traegt sie also, sobald jemand ihn ansieht. Sie SUCHT
     nur; die Wirkung traegt weiterhin ein Mensch ein
     (lib/kuendigungen.ts). Schlug sie fehl, sucht der Zeitplan
     erneut, weil zuordnung_gesucht_am leer blieb. */

  // Das Team muss den Eingang sofort sehen
  await melde({
    /* EIGENE KENNUNG (16.08.2026): Vorher lief das ueber
       "buchung.eingegangen", also ueber dieselbe Kennung wie eine
       gewoehnliche Bestellung. Eine Kuendigung geht nie an einen
       Makler (NUR_AN_DEN_ADMIN), und mit einer geteilten Kennung
       haette der Riegel sie nicht von einer Buchung unterscheiden
       koennen. */
    ereignis: "kuendigung.eingegangen",
    empfaenger: { art: "admin" },
    kurztext: "Eine Kündigung ist über die öffentliche Stelle eingegangen",
    kennungen: { vorgang: eingang.id },
    adminPfad: "/admin/buchungen",
  });

  /* DIE ANTWORT SAGT NICHTS UEBER DAS ERGEBNIS DER SUCHE. Sie ist
     immer dieselbe, ob ein Konto gefunden wurde oder nicht. Sonst
     waere dieses Formular eine Auskunftsstelle darueber, wer bei uns
     Kunde ist, und dafuer braeuchte man nur eine Adresse zu raten. */
  return NextResponse.json({ ok: true, eingegangen_am: eingang.eingegangen_am });
}
