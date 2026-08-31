import { NextResponse } from "next/server";
import {
  BREMS_SAETZE,
  GRENZEN,
  tuerStandVoll,
  tuerVoll,
  tuerZaehlen,
} from "@/lib/bremse";
import { linkAnlegen, linkPruefen, LINK_LAUFZEIT_TAGE } from "@/lib/einmal-link";
import { hatBonitaetscheck, type Buchung } from "@/lib/entitlements";
import { mailKonfiguriert, sendeMail } from "@/lib/mail";
import { bonitaetsnachweisMail } from "@/lib/mail-vorlagen";
import { OBJEKTART_LABELS, type Objektart } from "@/lib/objekt-felder";
import { supabaseService } from "@/lib/supabase/service";
import { formatDatum } from "@/lib/utils";

/**
 * "Upload-Link erneut zusenden" auf der Terminseite (Bau-Runde 5).
 *
 * WOZU: Wer ohne Nachweis auf der Terminseite landete, las bisher nur,
 * DASS ein Nachweis noetig ist, und sass fest: Der Upload-Link steckt
 * in einer Mail, die womoeglich lange her oder geloescht ist, und die
 * Seite bot keinen Weg dorthin. Diese Route stellt den Link neu aus
 * und schickt ihn an die Adresse, die zum Vorgang hinterlegt ist.
 *
 * SICHERHEIT: Der Termin-Token selbst ist der Ausweis; er gehoert
 * genau dieser Person. Die Mail geht AUSSCHLIESSLICH an die
 * hinterlegte Adresse, nie an eine mitgeschickte.
 *
 * ZWEI ZAEHLUNGEN, und das ist der Kern dieser Route (Bau-Runde 17,
 * 21.08.2026). Vorher gab es eine einzige, knappe Zahl (drei je Link
 * und Tag), und sie zaehlte GANZ OBEN, vor fuenf Fehlerwegen (503,
 * zweimal 409, 500, 502). Wer dreimal an einem geschlossenen
 * Mailversand haengenblieb, las beim vierten Versuch, der Link sei ihm
 * heute bereits zugesandt worden, und war fuer den Kalendertag
 * gesperrt. Das steht auf einer oeffentlichen Token-Strecke, vor einem
 * Menschen, den wir nicht kennen und der uns nicht anruft.
 *
 * Nur noch bei Erfolg zu zaehlen waere die Gegenfalle gewesen: Wer den
 * Versand zuverlaessig scheitern laesst, koennte die Strecke sonst
 * beliebig oft anstossen. Das ist dieselbe offene Tuer, die
 * Bau-Runde 6 geschlossen hat. Deshalb zwei:
 *
 *   1. DIE TUER, grosszuegig, auf VERSUCHE (nachweisMailVersuche...):
 *      zaehlt wie bisher ganz oben, auch jeden gescheiterten Versuch.
 *      Sie begrenzt den Missbrauch. Ihr Satz behauptet NICHTS.
 *   2. DIE ZAHL HINTER DEM SATZ, knapp, auf ZUGESTELLTE MAILS
 *      (nachweisMailJeToken24h): wird oben nur GELESEN und erst nach
 *      belegtem Versand erhoeht. Nur sie darf sagen, dass heute schon
 *      etwas hinausging, und dann stimmt es auch.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "buchung");
  if (!pruefung.gueltig) {
    return NextResponse.json(
      { meldung: "Dieser Link ist nicht mehr gültig." },
      { status: 403 }
    );
  }
  const link = pruefung.link;
  const service = supabaseService();
  if (!service || !link.objekt_id || !link.ziel_id) {
    return NextResponse.json({ meldung: "Gerade nicht verfügbar." }, { status: 503 });
  }

  /* 1) DIE TUER. Zaehlt jeden Versuch, auch den gleich scheiternden.
     Ihr Satz sagt nur, dass es gerade nicht geht, und was zu tun ist. */
  if (
    tuerVoll(
      "nachweis-mail-versuch",
      link.id,
      GRENZEN.tueren.nachweisMailVersucheJeToken24h
    )
  ) {
    return NextResponse.json(
      { meldung: BREMS_SAETZE.nachweisMailNichtMoeglich },
      { status: 429 }
    );
  }

  /* 2) DIE ZAHL HINTER DEM SATZ. Nur NACHSEHEN; erhoeht wird sie
     unten, nach belegtem Versand. Deshalb darf dieser Satz von einer
     zugestellten Mail sprechen: Er erscheint nur, wenn wirklich schon
     drei hinausgingen. */
  if (
    tuerStandVoll("nachweis-mail", link.id, GRENZEN.tueren.nachweisMailJeToken24h)
  ) {
    // wirkung: gewollt ohne Ruecknahme, weil tuerStandVoll nichts zaehlt; gezaehlt wird erst hinter dem belegten Versand (tuerZaehlen am Ende dieser Funktion).
    return NextResponse.json({ meldung: BREMS_SAETZE.nachweisMail }, { status: 429 });
  }

  if (!mailKonfiguriert()) {
    return NextResponse.json(
      { meldung: "Der Versand ist gerade nicht möglich. Bitte versuchen Sie es später noch einmal." },
      { status: 503 }
    );
  }

  const { data: person } = await service
    .from("interessenten")
    .select("id, email, vorname, nachname, anzeigename")
    .eq("id", link.ziel_id)
    .maybeSingle<{
      id: string;
      email: string | null;
      vorname: string | null;
      nachname: string | null;
      anzeigename: string | null;
    }>();
  const empfaenger = link.empfaenger_email ?? person?.email ?? null;
  if (!person || !empfaenger) {
    return NextResponse.json(
      {
        meldung:
          "Zu Ihrem Vorgang ist keine E-Mail-Adresse hinterlegt. Antworten Sie bitte kurz auf eine der E-Mails, die Sie erhalten haben, dann hilft man Ihnen dort weiter.",
      },
      { status: 409 }
    );
  }

  /* Der Upload braucht eine Anfrage (dort liegt die Ablage). Am
     Termin-Link haengt sie in aller Regel; bei einer von Hand
     angelegten Akte kann sie fehlen. */
  let anfrageId = link.anfrage_id ?? null;
  if (!anfrageId) {
    const { data: anfrage } = await service
      .from("anfragen")
      .select("id")
      .eq("interessent_id", person.id)
      .order("eingegangen_am", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    anfrageId = anfrage?.id ?? null;
  }

  const { data: buchungen } = await service
    .from("buchungen")
    .select("id, user_id, leistung_id, art, status, gebucht_am, abgewaehlt")
    .eq("user_id", link.user_id);
  const gebucht = hatBonitaetscheck((buchungen ?? []) as Buchung[]);

  if (!anfrageId || !gebucht) {
    /* Ohne Ablage oder ohne gebuchte Leistung kann der Upload-Weg
       nicht ausgestellt werden. Ehrlich sagen, was zu tun ist, statt
       einen Link zu versprechen, der nicht kommt. */
    return NextResponse.json(
      {
        meldung:
          "Das lässt sich gerade nicht automatisch anstoßen. Antworten Sie bitte kurz auf eine der E-Mails zu Ihrer Anfrage, dann meldet sich die Verkäuferseite mit dem Upload-Link.",
      },
      { status: 409 }
    );
  }

  const { data: objekt } = await service
    .from("objekte")
    .select("stadt, objektart, nachweis_vor_besichtigung")
    .eq("id", link.objekt_id)
    .maybeSingle<{
      stadt: string | null;
      objektart: string | null;
      nachweis_vor_besichtigung: boolean;
    }>();
  const bezeichnung =
    [
      objekt?.objektart ? OBJEKTART_LABELS[objekt.objektart as Objektart] : null,
      objekt?.stadt,
    ]
      .filter(Boolean)
      .join(" in ") || "Ihrer Anfrage";

  const neuerLink = await linkAnlegen({
    zweck: "bonitaetsnachweis",
    userId: link.user_id,
    objektId: link.objekt_id,
    anfrageId,
    zielId: person.id,
    empfaengerEmail: empfaenger,
    empfaengerName:
      link.empfaenger_name ??
      ([person.vorname, person.nachname].filter(Boolean).join(" ") || person.anzeigename),
    erstelltVon: null,
  });
  if (!neuerLink) {
    return NextResponse.json(
      { meldung: "Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal." },
      { status: 500 }
    );
  }

  const frist = new Date(
    Date.now() + LINK_LAUFZEIT_TAGE.bonitaetsnachweis * 24 * 60 * 60 * 1000
  );
  const mail = bonitaetsnachweisMail({
    name:
      link.empfaenger_name ??
      ([person.vorname, person.nachname].filter(Boolean).join(" ") || null),
    objektBezeichnung: bezeichnung,
    link: neuerLink.adresse,
    gueltigBis: formatDatum(frist),
    pflicht: objekt?.nachweis_vor_besichtigung ?? true,
  });
  const versandt = await sendeMail({
    an: empfaenger,
    betreff: mail.betreff,
    html: mail.html,
    text: mail.text,
    art: "benachrichtigung",
    vorlage: "bonitaet-anfordern",
    userId: link.user_id,
  });
  if (!versandt) {
    return NextResponse.json(
      { meldung: "Die Mail ließ sich nicht versenden. Bitte versuchen Sie es später noch einmal." },
      { status: 502 }
    );
  }

  /* DIE WIRKUNG IST BELEGT, jetzt erst zaehlt sie. Ab der dritten
     zugestellten Mail traegt der Satz oben die Wahrheit. */
  tuerZaehlen("nachweis-mail", link.id);

  return NextResponse.json({
    ok: true,
    meldung: "Der Link ist unterwegs an die E-Mail-Adresse, die zu Ihrem Vorgang hinterlegt ist.",
  });
}
