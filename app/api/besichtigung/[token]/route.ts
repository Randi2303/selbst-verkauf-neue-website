import { NextResponse } from "next/server";
import { BREMS_SAETZE, GRENZEN, tuerVoll } from "@/lib/bremse";
import { meldeFuerKunden } from "@/lib/ereignis";
import {
  ereignisVermerken,
  OBJEKT_FELDER,
  sendeBestaetigung,
  sendeRueckmeldungAnVerkaeufer,
  statusVermerken,
  type BesichtigungsObjekt,
  type BesichtigungsPerson,
} from "@/lib/besichtigungen-server";
import { type Besichtigung } from "@/lib/besichtigungen";
import { linkPruefen, nutzungVermerken } from "@/lib/einmal-link";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Zusagen oder absagen, durch einen Interessenten OHNE Konto. Der
 * einzige Ausweis ist das Token aus der Einladung.
 *
 * Der Link haengt an der PERSON, nicht an einem Termin: In ziel_id
 * steht die interessenten-Id. Welcher Termin gemeint ist, sagt der
 * Aufruf. Damit fuehren auch aeltere Mails derselben Person noch auf
 * den aktuellen Stand.
 *
 * WER ZUERST ZUSAGT, BEKOMMT DEN PLATZ. Bei einer Sammelbesichtigung
 * kann der Platz vergeben sein, bevor jemand antwortet. Dann bekommt er
 * einen ehrlichen Satz und seine Einladung den Zustand "belegt", statt
 * dass er unbemerkt der Fuenfte auf vier Plaetzen wird.
 */
export async function POST(
  anfrage: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const pruefung = await linkPruefen(token, "besichtigung");
  if (!pruefung.gueltig) {
    return NextResponse.json(
      {
        meldung:
          pruefung.grund === "abgelaufen"
            ? "Dieser Link ist abgelaufen."
            : "Dieser Link gilt nicht mehr.",
      },
      { status: 403 }
    );
  }
  const link = pruefung.link;
  const service = supabaseService();
  if (!service) {
    return NextResponse.json({ meldung: "Gerade nicht möglich." }, { status: 503 });
  }

  let koerper: { besichtigung_id?: unknown; antwort?: unknown; rueckmeldung?: unknown };
  try {
    koerper = await anfrage.json();
  } catch {
    return NextResponse.json({ meldung: "Ungültige Anfrage." }, { status: 400 });
  }
  const antwort = koerper.antwort;
  if (antwort !== "zusagen" && antwort !== "absagen") {
    return NextResponse.json({ meldung: "Unbekannte Antwort." }, { status: 400 });
  }

  /* Jeder Wechsel zwischen Zusage und Absage schickt Mails an den
     Verkaeufer und schreibt Chronik-Zeilen. Die Grenze je Link und
     Tag (lib/bremse.ts) deckelt das; wer sich einmal umentscheidet,
     bleibt weit darunter. */
  if (tuerVoll("besichtigung", link.id, GRENZEN.tueren.besichtigungJeToken24h)) {
    return NextResponse.json({ meldung: BREMS_SAETZE.besichtigung }, { status: 429 });
  }
  const rueckmeldung =
    typeof koerper.rueckmeldung === "string" ? koerper.rueckmeldung.trim() || null : null;

  const interessentId = link.ziel_id ?? "";

  // Die Einladung ist der Ausweis: Ohne sie geht hier nichts, auch nicht
  // mit einem gueltigen Token fuer eine andere Besichtigung.
  const { data: einladung } = await service
    .from("besichtigungs_einladungen")
    .select("id, besichtigung_id, status")
    .eq("besichtigung_id", koerper.besichtigung_id ?? "")
    .eq("interessent_id", interessentId)
    .maybeSingle<{ id: string; besichtigung_id: string; status: string }>();
  if (!einladung) {
    return NextResponse.json(
      { meldung: "Zu diesem Termin liegt keine Einladung für Sie vor." },
      { status: 404 }
    );
  }

  const { data: terminDaten } = await service
    .from("besichtigungen")
    .select("*")
    .eq("id", einladung.besichtigung_id)
    .maybeSingle();
  const termin = terminDaten as Besichtigung | null;
  if (!termin) {
    return NextResponse.json({ meldung: "Diesen Termin gibt es nicht mehr." }, { status: 404 });
  }

  await nutzungVermerken(link.id);

  /* Frueher wurde hier zusaetzlich das Profil des Verkaeufers geholt.
     Es wurde nie verwendet: Wer die Rueckmeldung bekommt, entscheidet
     empfaengerFuerHinweis() in lib/benachrichtigung.ts. Die Abfrage lief
     bei JEDEM Oeffnen des Links mit und ist ersatzlos raus. */
  const [{ data: objektDaten }, { data: personDaten }] = await Promise.all([
    service.from("objekte").select(OBJEKT_FELDER).eq("id", termin.objekt_id).maybeSingle(),
    service
      .from("interessenten")
      .select("id, anzeigename, email, status")
      .eq("id", interessentId)
      .maybeSingle(),
  ]);
  const objekt = objektDaten as BesichtigungsObjekt | null;
  const person = personDaten as (BesichtigungsPerson & { status: string }) | null;
  if (!objekt || !person) {
    return NextResponse.json({ meldung: "Gerade nicht möglich." }, { status: 503 });
  }

  /* ---------------------------------------------------------------- */
  /* Absage                                                            */
  /* ---------------------------------------------------------------- */
  if (antwort === "absagen") {
    /* EIN UNTEILBARER SCHRITT IN DER DATENBANK (Migration 0084),
       dasselbe Muster wie die Zusage weiter unten (0059): Einladung
       und Termin aendern sich zusammen oder gar nicht, unter derselben
       Zeilensperre, gegen die eine gleichzeitige Zusage anlaeuft.
       Vorher standen hier zwei ungepruefte Schreibvorgaenge: Scheiterte
       der erste, las der Interessent "Danke", der Verkaeufer plante
       weiter mit ihm, und die Erinnerungen mahnten ihn weiter an. */
    const { data: absageErgebnis, error: absageFehler } = await service.rpc(
      "besichtigung_absage_interessent",
      { p_einladung_id: einladung.id, p_rueckmeldung: rueckmeldung }
    );
    if (absageFehler) {
      console.error("[besichtigung] Absage fehlgeschlagen:", absageFehler.message);
      return NextResponse.json(
        { meldung: "Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal." },
        { status: 500 }
      );
    }
    const absageStand = String(absageErgebnis ?? "unbekannt");
    if (absageStand === "unbekannt") {
      return NextResponse.json(
        { meldung: "Diese Einladung gibt es nicht mehr." },
        { status: 404 }
      );
    }
    /* Ein zweiter Klick auf denselben Link: Die Absage steht schon, es
       wird nichts doppelt vermerkt und nichts doppelt gemeldet. */
    if (absageStand === "schon") {
      return NextResponse.json({ ok: true, zustand: "abgesagt", erneut: true });
    }

    /* DER ZUSTAND NACH DER ABSAGE, aus der Antwort der Funktion. Mail
       und Kalenderdatei muessen aus dem Nachher entstehen: Bis Runde 9
       ging hier das alte Objekt hinein, die Kalenderdatei behielt
       STATUS:CONFIRMED, und der Eintrag blieb im Kalender des
       Verkaeufers stehen, obwohl niemand mehr kam. */
    const terminNachher: Besichtigung =
      absageStand === "verfallen" ||
      absageStand === "vorgeschlagen" ||
      absageStand === "bestaetigt"
        ? { ...termin, status: absageStand }
        : termin;

    await meldeFuerKunden(termin.user_id, {
      ereignis: "besichtigung.absage",
      kurztext: "Eine Besichtigung wurde abgesagt",
      kennungen: { kunde: termin.user_id, vorgang: termin.id },
      adminPfad: "/admin/termine",
    });

    await ereignisVermerken({
      besichtigungId: termin.id,
      interessentenIds: [person.id],
      userId: termin.user_id,
      art: "abgesagt",
      zeitpunkt: termin.beginn,
      dauerMinuten: termin.dauer_minuten,
      rueckmeldung,
    });

  /* Kein "if (mailKonfiguriert())" davor: sendeMail() faengt den Fall
     selbst ab UND vermerkt ihn im Versandprotokoll. Mit der Abfrage
     davor blieb ein fehlender Schluessel eine stille Luecke, und ein
     fehlender Ausloeser sah genauso aus. */
    {
      await sendeRueckmeldungAnVerkaeufer({
        userId: termin.user_id,
        person,
        besichtigung: terminNachher,
        zugesagt: false,
        rueckmeldung,
        /* Fuer den Kalendereintrag. Er entsteht aus terminNachher:
           Faellt der Termin durch diese Absage (verfallen), traegt die
           Datei STATUS:CANCELLED und raeumt den Eintrag aus dem
           Kalender des Verkaeufers, statt ihn als bestaetigt stehen zu
           lassen. */
        objekt,
        terminHinfaellig: absageStand === "verfallen",
      });
    }

    return NextResponse.json({ ok: true, zustand: "abgesagt" });
  }

  /* ---------------------------------------------------------------- */
  /* Zusage                                                            */
  /* ---------------------------------------------------------------- */

  /* EIN UNTEILBARER SCHRITT IN DER DATENBANK (Migration 0059).
     Vorher stand hier: zaehlen, entscheiden, eintragen. Zwischen
     Zaehlen und Eintragen lag eine Luecke, und bei einem Tag der
     offenen Tuer ist die kein theoretischer Fall, weil alle
     Eingeladenen dieselbe Mail zur selben Minute bekommen. Zwei
     gleichzeitige Zusagen auf den letzten Platz gingen beide durch.

     besichtigung_zusagen() sperrt die Termin-Zeile, zaehlt und traegt
     ein. Dieselbe Loesung wie bei den Gutscheinen (0053). */
  const { data: ergebnis, error: zusageFehler } = await service.rpc(
    "besichtigung_zusagen",
    { p_einladung_id: einladung.id, p_rueckmeldung: rueckmeldung }
  );
  if (zusageFehler) {
    console.error("[besichtigung] Zusage fehlgeschlagen:", zusageFehler.message);
    return NextResponse.json(
      { meldung: "Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal." },
      { status: 500 }
    );
  }

  const stand = String(ergebnis ?? "unbekannt");

  if (stand === "voll") {
    /* Die Einladung steht dank der Funktion schon auf "belegt". Hier
       kommt nur noch die Chronik dazu, denn sie gehoert nicht in eine
       Datenbank-Funktion: Sie schreibt ihrerseits Zeilen und wuerde
       die Sperre laenger halten als noetig. */
    await ereignisVermerken({
      besichtigungId: termin.id,
      interessentenIds: [person.id],
      userId: termin.user_id,
      art: "belegt",
      zeitpunkt: termin.beginn,
      dauerMinuten: termin.dauer_minuten,
    });
  }

  if (stand !== "ok" && stand !== "schon") {
    return NextResponse.json(
      {
        meldung:
          stand === "voll"
            ? "Für diesen Termin sind alle Plätze vergeben. Der Eigentümer meldet sich mit einem neuen Vorschlag bei Ihnen."
            : stand === "vorbei"
              ? "Dieser Termin liegt bereits in der Vergangenheit."
              : stand === "abgesagt"
                ? "Dieser Termin wurde abgesagt."
                : "Diese Einladung gibt es nicht mehr.",
        zustand: stand,
      },
      { status: 409 }
    );
  }

  /* Ein zweiter Klick auf denselben Link. Die Zusage steht schon, es
     wird nichts doppelt gezaehlt und nichts doppelt gemeldet. */
  if (stand === "schon") {
    return NextResponse.json({ ok: true, zustand: "zugesagt", erneut: true });
  }

  /* Ohne Namen des Interessenten und ohne Adresse: Wer zusagt und wo,
     steht im Admin, nicht in einem Chat. */
  await meldeFuerKunden(termin.user_id, {
    ereignis: "besichtigung.zusage",
    kurztext: "Eine Besichtigung wurde zugesagt",
    kennungen: { kunde: termin.user_id, vorgang: termin.id },
    adminPfad: "/admin/termine",
  });

  // Die Zusage in die Chronik, mit dem Zeitpunkt, der JETZT gilt. Sie
  // bleibt damit sichtbar, auch wenn der Verkaeufer den Termin spaeter
  // verschiebt und die Einladung dabei zurueckgesetzt wird.
  await ereignisVermerken({
    besichtigungId: termin.id,
    interessentenIds: [person.id],
    userId: termin.user_id,
    art: "zugesagt",
    zeitpunkt: termin.beginn,
    dauerMinuten: termin.dauer_minuten,
    rueckmeldung,
  });

  /* Die uebrigen Vorschlaege DESSELBEN ZUSAMMENHANGS werden
     hinfaellig, sonst stuenden drei Termine mit derselben Person im
     Kalender, nur weil ihr drei Zeiten angeboten wurden.

     SEIT DEN TERMINARTEN (0042) GILT DAS JE ZUSAMMENHANG, nicht mehr
     pauschal fuer alles Offene der Person:
       einzeltermin  die uebrigen Alternativ-Vorschlaege (gleiche Art)
       zeitfenster   die uebrigen Fenster DERSELBEN Serie
       gruppentermin nichts; eine unabhaengige Einladung der Person zu
                     einem anderen Termin bleibt bestehen
     Vorher liess die Zusage auf ein Zeitfenster auch die Einladung zum
     Gruppentermin naechste Woche verfallen, ein anderer Vorgang. */
  const { data: andere } = await service
    .from("besichtigungs_einladungen")
    .select(
      "id, besichtigung_id, besichtigung:besichtigungen(beginn, dauer_minuten, art, serie_id)"
    )
    .eq("interessent_id", interessentId)
    .eq("status", "offen")
    .neq("besichtigung_id", termin.id);

  type AndereEinladung = {
    id: string;
    besichtigung_id: string;
    besichtigung: {
      beginn: string;
      dauer_minuten: number;
      art: string;
      serie_id: string | null;
    } | null;
  };
  const betroffene = ((andere ?? []) as unknown as AndereEinladung[]).filter(
    (e) => {
      if (!e.besichtigung) return false;
      if (termin.art === "zeitfenster") {
        return (
          e.besichtigung.serie_id !== null &&
          e.besichtigung.serie_id === termin.serie_id
        );
      }
      if (termin.art === "einzeltermin") {
        return e.besichtigung.art === "einzeltermin";
      }
      return false;
    }
  );

  for (const e of betroffene) {
    await service
      .from("besichtigungs_einladungen")
      .update({ status: "verfallen" })
      .eq("id", e.id);

    if (e.besichtigung) {
      await ereignisVermerken({
        besichtigungId: e.besichtigung_id,
        interessentenIds: [person.id],
        userId: termin.user_id,
        art: "verfallen",
        zeitpunkt: e.besichtigung.beginn,
        dauerMinuten: e.besichtigung.dauer_minuten,
      });
    }

    // Der Termin selbst wird nur hinfaellig, wenn niemand mehr auf ihn
    // wartet. Bei einer Sammelbesichtigung bleiben die anderen Gaeste.
    const { data: rest } = await service
      .from("besichtigungs_einladungen")
      .select("status")
      .eq("besichtigung_id", e.besichtigung_id)
      .in("status", ["offen", "zugesagt"]);
    if ((rest ?? []).length === 0) {
      await service
        .from("besichtigungen")
        .update({ status: "verfallen", geaendert_am: new Date().toISOString() })
        .eq("id", e.besichtigung_id);
    }
  }

  /* Wer einen Besichtigungstermin bestaetigt, ist in Kontakt.
     STAND HIER BIS ZUM 13.08.2026 AUF "im_gespraech", einem Wert aus
     der Zeit vor 0056. Die Datenbank wies ihn ab, der Fehler wurde
     nicht geprueft, und der Stand blieb still auf "neu" stehen. */
  if (person.status === "neu") {
    await statusVermerken({
      interessentId: person.id,
      userId: termin.user_id,
      von: person.status,
      nach: "in_kontakt",
    });
  }

  const bestaetigt: Besichtigung = { ...termin, status: "bestaetigt" };
  /* Kein "if (mailKonfiguriert())" davor: sendeMail() faengt den Fall
     selbst ab UND vermerkt ihn im Versandprotokoll. Mit der Abfrage
     davor blieb ein fehlender Schluessel eine stille Luecke, und ein
     fehlender Ausloeser sah genauso aus. */
  {
    await sendeBestaetigung({
      objekt,
      person,
      userId: termin.user_id,
      besichtigung: bestaetigt,
    });
    await sendeRueckmeldungAnVerkaeufer({
      userId: bestaetigt.user_id,
      person,
      besichtigung: bestaetigt,
      zugesagt: true,
      rueckmeldung,
      objekt,
    });
  }

  return NextResponse.json({ ok: true, zustand: "bestaetigt" });
}
