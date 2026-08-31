import { NextResponse } from "next/server";
import { BREMS_SAETZE, GRENZEN, tuerVoll } from "@/lib/bremse";
import {
  FINANZIERUNGSARTEN,
  GEBOT_MAX_EURO,
  GEBOT_MIN_EURO,
} from "@/config/bieterverfahren";
import { nimmtGeboteAn, type Bieterverfahren } from "@/lib/bieterverfahren";
import { linkPruefen, nutzungVermerken } from "@/lib/einmal-link";
import { gebotGemeldet } from "@/lib/gebots-meldung";
import { sendeMailMitBefund } from "@/lib/mail";
import { gebotEingegangenMail } from "@/lib/mail-vorlagen";
import { meldeFuerKunden } from "@/lib/ereignis";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Alle Anfrage-Kennungen DERSELBEN Person, ausgehend von der Anfrage
 * eines Einmal-Links. Ein Bieter ist ein Mensch, keine Anfrage-Zeile
 * (Feinschliff 24.08.2026): Wer zweimal geschrieben hatte, besass
 * zwei Links und konnte in derselben Runde zweimal bieten. Anfragen
 * ohne Akte (Altbestand vor Migration 0043) fallen auf sich selbst
 * zurueck.
 */
async function anfragenDerselbenPerson(
  service: NonNullable<ReturnType<typeof supabaseService>>,
  anfrageId: string | null
): Promise<string[]> {
  if (!anfrageId) return [];
  const { data: anfrage } = await service
    .from("anfragen")
    .select("interessent_id")
    .eq("id", anfrageId)
    .maybeSingle<{ interessent_id: string | null }>();
  if (!anfrage?.interessent_id) return [anfrageId];
  const { data: geschwister } = await service
    .from("anfragen")
    .select("id")
    .eq("interessent_id", anfrage.interessent_id)
    .returns<{ id: string }[]>();
  return geschwister && geschwister.length > 0
    ? geschwister.map((g) => g.id)
    : [anfrageId];
}

/**
 * Gebot abgeben, aendern oder zurueckziehen, durch einen Interessenten
 * OHNE Konto. Der einzige Ausweis ist das Token aus der Einladung.
 *
 * Was diese Route BEWUSST nie zurueckgibt: irgendetwas ueber die
 * Gebote anderer. Kein Hoechststand, keine Anzahl, kein Rang. Ein
 * Bieter erfaehrt hier ausschliesslich seinen eigenen Stand.
 *
 * Ohne gueltigen Bonitaetsnachweis wird kein Gebot angenommen. Das ist
 * der einzige wirksame Schutz gegen Fantasiegebote; juristisch laesst
 * sich ein Gebot vor dem Notartermin nicht binden.
 */

type Bestaetigungen = { regeln?: boolean; keine_bindung?: boolean; datenschutz?: boolean };

async function ladeKontext(token: string) {
  const pruefung = await linkPruefen(token, "gebot");
  if (!pruefung.gueltig) {
    return {
      fehler: NextResponse.json(
        {
          meldung:
            pruefung.grund === "abgelaufen"
              ? "Dieser Link ist abgelaufen."
              : "Dieser Link gilt nicht mehr.",
        },
        { status: 403 }
      ),
    };
  }
  const service = supabaseService();
  if (!service) {
    return { fehler: NextResponse.json({ meldung: "Gerade nicht möglich." }, { status: 503 }) };
  }
  const link = pruefung.link;
  const { data: verfahren } = await service
    .from("bieterverfahren")
    .select("*")
    .eq("id", link.ziel_id ?? "")
    .maybeSingle<Bieterverfahren>();
  if (!verfahren) {
    return { fehler: NextResponse.json({ meldung: "Verfahren nicht gefunden." }, { status: 404 }) };
  }
  return { link, verfahren, service };
}

/** Gebot abgeben oder erhoehen */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const k = await ladeKontext(token);
  if (k.fehler) return k.fehler;
  const { link, verfahren, service } = k;

  if (!nimmtGeboteAn(verfahren)) {
    /* ZWEI ZUSTAENDE, ZWEI SAETZE, wie bei istBuchbar (Bau-Runde 5):
       Ein Verfahren im Stand "vorbereitet" hat noch gar keine Frist,
       die ablaufen koennte; der alte Satz "Die Frist ist abgelaufen"
       war dort sachlich falsch. Erreichbar ist der Fall nur mit einem
       von Hand erzeugten Link, der Satz muss trotzdem stimmen. */
    return NextResponse.json(
      {
        meldung:
          verfahren.status === "abgebrochen"
            ? "Dieses Verfahren wurde abgebrochen."
            : verfahren.status === "vorbereitet"
              ? "Dieses Verfahren hat noch nicht begonnen, es sind noch keine Gebote möglich."
              : "Die Frist ist abgelaufen, es sind keine Gebote mehr möglich.",
      },
      { status: 409 }
    );
  }

  /* Je Speichern geht eine Mail an die angegebene Adresse und eine
     Team-Meldung hinaus. Die Grenze je Link und Tag (lib/bremse.ts)
     ist so weit, dass auch ein hitziges Bieten am letzten Tag nie
     anstoesst; eine Mail-Schleife stoesst an. */
  if (tuerVoll("gebot", link.id, GRENZEN.tueren.gebotJeToken24h)) {
    return NextResponse.json({ meldung: BREMS_SAETZE.gebot }, { status: 429 });
  }

  const daten = (await request.json().catch(() => null)) as {
    betrag?: number;
    name?: string;
    email?: string;
    telefon?: string;
    finanzierungsart?: string;
    bestaetigungen?: Bestaetigungen;
  } | null;

  const betrag = Number(daten?.betrag);
  if (!Number.isFinite(betrag) || betrag < GEBOT_MIN_EURO || betrag > GEBOT_MAX_EURO) {
    return NextResponse.json({ meldung: "Bitte geben Sie einen plausiblen Betrag an." }, { status: 400 });
  }
  const name = String(daten?.name ?? "").trim();
  const email = String(daten?.email ?? "").trim();
  if (name.length < 3) {
    return NextResponse.json({ meldung: "Bitte geben Sie Ihren vollständigen Namen an." }, { status: 400 });
  }
  if (!/^[^\s<>@,]+@[^\s<>@,]+\.[^\s<>@,]{2,}$/.test(email)) {
    return NextResponse.json({ meldung: "Bitte geben Sie eine gültige E-Mail-Adresse an." }, { status: 400 });
  }
  const finanzierungsart = String(daten?.finanzierungsart ?? "");
  if (!FINANZIERUNGSARTEN.some((f) => f.id === finanzierungsart)) {
    return NextResponse.json({ meldung: "Bitte wählen Sie aus, wie Sie finanzieren." }, { status: 400 });
  }

  // Alle drei Bestaetigungen sind Pflicht, keine davon vorbelegt
  const b = daten?.bestaetigungen ?? {};
  if (!b.regeln || !b.keine_bindung || !b.datenschutz) {
    return NextResponse.json(
      { meldung: "Bitte bestätigen Sie alle drei Punkte, bevor Sie Ihr Gebot abgeben." },
      { status: 400 }
    );
  }

  // OHNE NACHWEIS KEIN GEBOT. Der Nachweis haengt an derselben Anfrage.
  const { data: nachweis } = await service
    .from("bonitaetsnachweise")
    .select("id")
    .eq("anfrage_id", link.anfrage_id ?? "")
    .order("hochgeladen_am", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!nachweis) {
    return NextResponse.json(
      {
        meldung:
          "Für ein gültiges Gebot fehlt noch Ihr Nachweis über die Finanzierung. Bitte laden Sie ihn zuerst hoch.",
      },
      { status: 428 }
    );
  }

  /* Ein Gebot je BIETER und Runde: ein zweites ersetzt das erste,
     damit "erhoehen" nicht zu einer Liste von Versionen fuehrt.

     JE PERSON, NICHT JE ANFRAGE (Feinschliff 24.08.2026): Wer zwei
     Anfrage-Zeilen und damit zwei Einladungs-Links hatte, konnte
     vorher zweimal in derselben Runde bieten; die Zaehlung meldete
     dem Verkaeufer dann mehr Bieter, als es Menschen gab. Deshalb
     zaehlen alle Anfragen derselben Akte als EIN Bieter. Anfragen
     ohne Akte (Altbestand vor 0043) fallen auf die einzelne Anfrage
     zurueck. */
  const bieterAnfragen = await anfragenDerselbenPerson(service, link.anfrage_id);
  const { data: vorhanden } = await service
    .from("gebote")
    .select("id, betrag")
    .eq("verfahren_id", verfahren.id)
    .in("anfrage_id", bieterAnfragen.length > 0 ? bieterAnfragen : [""])
    .eq("runde", verfahren.aktuelle_runde)
    .limit(1)
    .maybeSingle<{ id: string; betrag: number }>();

  const felder = {
    verfahren_id: verfahren.id,
    user_id: verfahren.user_id,
    anfrage_id: link.anfrage_id,
    betrag,
    name: name.slice(0, 200),
    email: email.slice(0, 200),
    telefon: String(daten?.telefon ?? "").trim().slice(0, 60) || null,
    finanzierungsart,
    bonitaetsnachweis_id: nachweis.id,
    runde: verfahren.aktuelle_runde,
    status: "eingegangen" as const,
  };

  const { error } = vorhanden
    ? await service
        .from("gebote")
        .update({ ...felder, geaendert_am: new Date().toISOString() })
        .eq("id", vorhanden.id)
    : await service.from("gebote").insert(felder);

  if (error) {
    console.error("[gebot] Speichern fehlgeschlagen:", error);
    return NextResponse.json(
      { meldung: "Ihr Gebot ließ sich nicht speichern. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }

  await nutzungVermerken(link.id);

  /* Den zustaendigen Makler benachrichtigen. BEWUSST OHNE BETRAG:
     Gebotshoehen sind das Empfindlichste am ganzen Verfahren, und
     Telegram ist kein geschuetzter Kanal. Wer die Zahl braucht,
     klickt in den Admin. */
  await meldeFuerKunden(link.user_id, {
    ereignis: "gebot.eingegangen",
    kurztext: "Ein Gebot ist eingegangen",
    kennungen: { kunde: link.user_id, vorgang: verfahren.id },
    adminPfad: "/admin/bieterverfahren",
  });

  /* Kein "if (mailKonfiguriert())" mehr davor: sendeMail() faengt den
     Fall selbst ab UND vermerkt ihn im Versandprotokoll. Mit der
     Abfrage davor blieb ein fehlender Schluessel eine stille Luecke,
     und ein fehlender Ausloeser sah genauso aus. */
  const anBieter = gebotEingegangenMail({
    name,
    betrag,
    erhoeht: Boolean(vorhanden),
  });
  /* DER AUSGANG GEHT MIT IN DIE ANTWORT (24.08.2026): Die Erfolgsseite
     behauptete fest "Eine Bestätigung ist per E-Mail unterwegs", ohne
     den Versand gesehen zu haben. Jetzt sagt sie den Satz nur, wenn
     der Dienst angenommen hat; bei einem gewollten Vermerk
     (Pruefbetrieb, .invalid) entfaellt er ohne Alarm, bei einem echten
     Fehlschlag steht dort ehrlich, dass das Gebot trotzdem zaehlt. */
  const bestaetigung = await sendeMailMitBefund({
    an: email,
    betreff: anBieter.betreff,
    html: anBieter.html,
    text: anBieter.text,
    art: "benachrichtigung",
    vorlage: "gebot-eingegangen",
    /* Eigentuemer ist der VERKAEUFER des Verfahrens, nicht der Bieter:
       Nur so faengt der Vorfuehr-Riegel die Bieter-Mail eines
       Vorfuehr-Verfahrens ab (24.08.2026). */
    userId: link.user_id,
  });

  /* Und jetzt der VERKAEUFER. Genau das fehlte bisher: Er erfuhr von
     einem Gebot nur, wenn er die Seite zufaellig offen hatte. Der
     Aufruf steht hier, direkt hinter dem Speichern, und nicht im
     Browser.

     Ohne await waere es verlockend, aber falsch: Auf einer
     Server-Umgebung endet die Ausfuehrung mit der Antwort, und eine
     nicht abgewartete Zusage wird einfach abgeschnitten. Die Mail
     kostet den Bieter unter einer Sekunde, und scheitern kann sie
     nicht: gebotGemeldet() wirft nie. */
  const { count: anzahlGesamt } = await service
    .from("gebote")
    .select("id", { count: "exact", head: true })
    .eq("verfahren_id", verfahren.id)
    .eq("runde", verfahren.aktuelle_runde)
    .neq("status", "zurueckgezogen");

  await gebotGemeldet({
    service,
    verfahren: {
      id: verfahren.id,
      user_id: verfahren.user_id,
      gebots_mail_zuletzt_am: verfahren.gebots_mail_zuletzt_am ?? null,
    },
    betrag,
    anzahlGesamt: anzahlGesamt ?? 1,
  });

  return NextResponse.json({
    ok: true,
    betrag,
    erhoeht: Boolean(vorhanden),
    /* true: angenommen; false: echter Fehlschlag; null: gewollter
       Vermerk, dann macht die Seite schlicht keine Mail-Aussage */
    bestaetigungVerschickt: bestaetigung.verschickt
      ? true
      : bestaetigung.gewollt
        ? null
        : false,
  });
}

/** Gebot zurueckziehen, solange die Frist laeuft */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const k = await ladeKontext(token);
  if (k.fehler) return k.fehler;
  const { link, verfahren, service } = k;

  if (!nimmtGeboteAn(verfahren)) {
    // Dieselben zwei Zustaende wie beim Abgeben, siehe oben.
    return NextResponse.json(
      {
        meldung:
          verfahren.status === "abgebrochen"
            ? "Dieses Verfahren wurde abgebrochen."
            : verfahren.status === "vorbereitet"
              ? "Dieses Verfahren hat noch nicht begonnen, es gibt kein Gebot, das sich zurückziehen ließe."
              : "Die Frist ist abgelaufen, ein Rückzug ist jetzt nicht mehr möglich.",
      },
      { status: 409 }
    );
  }

  /* Auch der Rueckzug rechnet je PERSON: Das Gebot traegt die
     Anfrage des zuletzt benutzten Links, der Rueckzug darf aber auch
     ueber einen aelteren Link derselben Person kommen. */
  const rueckzugAnfragen = await anfragenDerselbenPerson(service, link.anfrage_id);
  const { error } = await service
    .from("gebote")
    .update({ status: "zurueckgezogen", geaendert_am: new Date().toISOString() })
    .eq("verfahren_id", verfahren.id)
    .in("anfrage_id", rueckzugAnfragen.length > 0 ? rueckzugAnfragen : [""])
    .eq("runde", verfahren.aktuelle_runde);

  if (error) {
    return NextResponse.json({ meldung: "Der Rückzug ist fehlgeschlagen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
