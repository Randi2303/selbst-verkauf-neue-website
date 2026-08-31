import { NextResponse } from "next/server";
import { EINWILLIGUNGS_FASSUNGEN } from "@/config/einwilligungen";
import {
  BONITAET_BUCKET,
  ERLAUBTE_DATEITYPEN,
  MAX_DATEI_BYTES,
  NACHWEIS_ARTEN,
  NACHWEIS_LOESCHFRIST_TAGE,
  type NachweisArt,
} from "@/lib/bonitaet";
import { BREMS_SAETZE, GRENZEN, tuerVoll } from "@/lib/bremse";
import { linkPruefen, nutzungVermerken } from "@/lib/einmal-link";
import { sendeHinweis } from "@/lib/benachrichtigung";
import { sendeMailMitBefund } from "@/lib/mail";
import {
  nachweisEingegangenMail,
  nachweisHochgeladenMail,
} from "@/lib/mail-vorlagen";
import { melde, meldeFuerKunden } from "@/lib/ereignis";
import { supabaseService } from "@/lib/supabase/service";
import { OBJEKTART_LABELS, type Objektart } from "@/lib/objekt-felder";
import { meldeDemKunden } from "@/lib/kunden-meldung";

/**
 * Upload eines Bonitaets- oder Finanzierungsnachweises durch einen
 * Interessenten OHNE Konto.
 *
 * Der einzige Ausweis ist das Token. Deshalb ist hier alles bewusst
 * eng: Die Route nimmt nur diese eine Datei zu genau der Anfrage an,
 * die im Link steht. Der Client bestimmt weder Pfad noch Besitzer.
 *
 * Die Datei landet ueber die Service-Rolle im privaten Bucket. Kunden
 * duerfen dort selbst nicht schreiben, siehe Migration 0023.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "bonitaetsnachweis");
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
  if (!link.anfrage_id || !link.objekt_id) {
    return NextResponse.json({ meldung: "Der Link ist unvollständig." }, { status: 400 });
  }

  /* Je Upload gehen zwei Mails und eine Team-Meldung hinaus, und es
     entstehen zwei Einwilligungs-Zeilen. Die Grenze je Link und Tag
     (lib/bremse.ts) deckelt das; wer sich vertan hat, laedt zweimal
     neu hoch und bleibt weit darunter. */
  if (tuerVoll("nachweis", link.id, GRENZEN.tueren.nachweisJeToken24h)) {
    return NextResponse.json({ meldung: BREMS_SAETZE.nachweis }, { status: 429 });
  }

  const service = supabaseService();
  if (!service) {
    return NextResponse.json(
      { meldung: "Der Upload ist gerade nicht möglich. Bitte versuchen Sie es später." },
      { status: 503 }
    );
  }

  /* DIE GROESSE ZUERST, VOR DEM LESEN DES RUMPFES (Befund vom
     31.08.2026, dieselbe Familie wie am 13.08. bei /api/unterlagen).

     Liegt ein Proxy vor der Route, und bei uns liegt einer, schneidet
     Next den Rumpf ab. `formData()` wirft dann, das alte
     `.catch(() => null)` machte daraus eine leere Eingabe, und die
     naechste Pruefung meldete "Bitte waehlen Sie eine Datei aus." Der
     Mensch am anderen Ende HATTE eine gewaehlt, seine Datei war nur zu
     gross oder die Leitung brach ab. Diesen Weg geht ein Interessent,
     also jemand ohne Konto, ohne Ausweg und ohne jemanden zum Fragen.

     Der Content-Length-Kopf steht vor dem Rumpf und laesst sich ohne
     ihn lesen. */
  const angekuendigt = Number(request.headers.get("content-length") ?? 0);
  if (angekuendigt > MAX_DATEI_BYTES) {
    return NextResponse.json(
      {
        meldung: `Diese Datei ist größer als ${Math.round(MAX_DATEI_BYTES / 1024 / 1024)} MB. Bitte verkleinern Sie sie, zum Beispiel indem Sie sie als JPG statt als PNG speichern.`,
      },
      { status: 413 }
    );
  }

  let daten: FormData;
  try {
    daten = await request.formData();
  } catch (fehler) {
    /* Hier landet der abgeschnittene oder abgebrochene Rumpf. Die
       Meldung sagt jetzt, was wirklich los war, statt dem Menschen
       vorzuwerfen, er habe nichts ausgewaehlt. */
    console.error("[nachweis] Rumpf nicht lesbar:", fehler);
    return NextResponse.json(
      {
        meldung:
          "Die Datei ist unterwegs abgebrochen. Das liegt meist an der Verbindung. Bitte versuchen Sie es noch einmal.",
      },
      { status: 400 }
    );
  }
  const datei = daten?.get("datei");
  const art = String(daten?.get("art") ?? "") as NachweisArt;
  const einwilligungVerarbeitung = daten?.get("einwilligung_verarbeitung") === "true";
  const einwilligungAuskunftei = daten?.get("einwilligung_auskunftei") === "true";
  const fassung = String(daten?.get("einwilligung_fassung") ?? "");

  if (!(datei instanceof File)) {
    return NextResponse.json({ meldung: "Bitte wählen Sie eine Datei aus." }, { status: 400 });
  }
  if (!NACHWEIS_ARTEN.some((a) => a.id === art)) {
    return NextResponse.json(
      { meldung: "Bitte wählen Sie aus, welche Unterlage Sie hochladen." },
      { status: 400 }
    );
  }
  // Ohne die erste Einwilligung duerfen wir die Unterlage nicht annehmen
  if (!einwilligungVerarbeitung) {
    return NextResponse.json(
      { meldung: "Ohne Ihre Einwilligung dürfen wir die Unterlage nicht annehmen." },
      { status: 400 }
    );
  }
  // Der Wortlaut kommt AUS UNSERER Konstante, nicht aus der Eingabe.
  // Der Browser meldet nur, WELCHE Fassung er angezeigt hat; was in
  // dieser Fassung steht, bestimmen wir. Sonst koennte man sich seine
  // eigene Einwilligung schreiben, und der Nachweis waere wertlos.
  const fassungsTexte = EINWILLIGUNGS_FASSUNGEN[fassung];
  if (!fassungsTexte) {
    return NextResponse.json(
      { meldung: "Bitte laden Sie die Seite neu und versuchen Sie es erneut." },
      { status: 400 }
    );
  }
  if (datei.size > MAX_DATEI_BYTES) {
    return NextResponse.json(
      { meldung: "Die Datei ist zu groß. Höchstens 10 MB." },
      { status: 400 }
    );
  }
  if (!ERLAUBTE_DATEITYPEN.includes(datei.type)) {
    return NextResponse.json(
      { meldung: "Bitte laden Sie ein PDF, ein JPG oder ein PNG hoch." },
      { status: 400 }
    );
  }

  /* ERST DIE EINWILLIGUNG, GEMESSEN, DANN ALLES WEITERE (Bau-Runde 9).
     Sie ist die Rechtsgrundlage des ganzen Vorgangs und genau der
     Beleg, der im Streitfall verlangt wird. Bis dahin wurde sie als
     LETZTER Schritt ungeprueft geschrieben: Scheiterte sie, war die
     Datei angenommen, die Mails waren draussen, und der Beleg fehlte,
     ohne dass es jemand merkte. Kann sie nicht festgeschrieben werden,
     wird die Unterlage gar nicht erst angenommen.

     Beide Einwilligungen mit Wortlaut und Fassung, auch die NICHT
     erteilte: Dass jemand die freiwillige Zustimmung bewusst nicht
     gegeben hat, ist genauso beweisbeduerftig wie das Gegenteil.

     Je VERSUCH entsteht ein Zeilenpaar, auch wenn der Upload danach
     scheitert. Das ist Absicht: Die Zeilen belegen, was die Person zu
     diesem Zeitpunkt erklaert hat, und ein Beleg zu viel ist besser
     als einer zu wenig. */
  const loeschenAb = new Date(
    Date.now() + NACHWEIS_LOESCHFRIST_TAGE * 24 * 60 * 60 * 1000
  );
  const jetzt = new Date().toISOString();
  const loeschenAbIso = loeschenAb.toISOString();
  const { data: einwilligungsZeilen, error: einwilligungsFehler } = await service
    .from("einwilligungen")
    .insert(
      (["verarbeitung", "auskunftei"] as const).map((zweck) => ({
        anfrage_id: link.anfrage_id,
        objekt_id: link.objekt_id,
        user_id: link.user_id,
        zweck,
        fassung,
        wortlaut: fassungsTexte[zweck].wortlaut,
        erteilt: zweck === "verarbeitung" ? true : einwilligungAuskunftei,
        freiwillig: fassungsTexte[zweck].freiwillig,
        erteilt_am: jetzt,
        loeschen_ab: loeschenAbIso,
      }))
    )
    .select("id");
  if (einwilligungsFehler || (einwilligungsZeilen ?? []).length !== 2) {
    console.error(
      "[nachweis] Einwilligung nicht festgeschrieben:",
      einwilligungsFehler?.message ?? `${(einwilligungsZeilen ?? []).length} von 2 Zeilen`
    );
    return NextResponse.json(
      { meldung: "Der Upload ist gerade nicht möglich. Bitte versuchen Sie es später." },
      { status: 500 }
    );
  }

  // Der Pfad kommt AUSSCHLIESSLICH aus dem Link, nie aus der Eingabe.
  // Der Dateiname des Nutzers waere sonst ein Weg, in fremde Ordner zu
  // schreiben.
  const endung =
    datei.type === "application/pdf" ? "pdf" : datei.type === "image/png" ? "png" : "jpg";
  const pfad = `${link.user_id}/${link.anfrage_id}/${crypto.randomUUID()}.${endung}`;

  const { error: uploadFehler } = await service.storage
    .from(BONITAET_BUCKET)
    .upload(pfad, datei, { contentType: datei.type, upsert: false });
  if (uploadFehler) {
    console.error("[nachweis] Upload fehlgeschlagen:", uploadFehler);
    return NextResponse.json(
      { meldung: "Die Datei ließ sich nicht speichern. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }

  // Ersetzt nur den frueheren Nachweis DERSELBEN ART. Die andere Art
  // bleibt bestehen: Ein Interessent darf beide Unterlagen einreichen,
  // und wer sich vertan hat, laedt dieselbe Art einfach erneut hoch.
  // Vorher wurde jeder frueher hochgeladene Nachweis geloescht, damit
  // war ein zweiter nie moeglich.
  const { data: alte } = await service
    .from("bonitaetsnachweise")
    .select("id, datei_pfad")
    .eq("anfrage_id", link.anfrage_id)
    .eq("art", art);
  const vorher = (alte ?? []) as { id: string; datei_pfad: string }[];

  /* ERST EINTRAGEN, DANN AUFRAEUMEN (Bau-Runde 17).
     Vorher wurde der alte Nachweis samt Datei geloescht, BEVOR der
     neue eingetragen war. Scheiterte das Eintragen, raeumte der
     Fehlerpfad auch noch die frisch hochgeladene Datei weg, und der
     Interessent stand ohne jeden Nachweis da, obwohl er einen hatte.
     Auf einer oeffentlichen Token-Strecke, mit der Bitte, es noch
     einmal zu versuchen.

     EIN UPSERT STATT LOESCHEN-UND-EINFUEGEN, weil ein Unique-Index
     auf (anfrage_id, art) liegt (Migration 0027): Zwei Zeilen
     derselben Art koennen nicht nebeneinander stehen, ein blosses
     Umdrehen der Reihenfolge scheiterte also an der Regel. Der Upsert
     macht daraus EINEN Schritt, der entweder ganz gelingt oder die
     alte Zeile unberuehrt laesst. Er behaelt zudem die Kennung der
     Zeile, sodass Verweise darauf (etwa eine wartende Erinnerung aus
     Migration 0078) nicht ins Leere zeigen.

     DIE PRUEFSPUR WIRD ZURUECKGESETZT: Ein neuer Nachweis ist
     ungeprueft, auch wenn der alte schon bestaetigt war. Sonst truege
     die frische Datei die Bestaetigung der alten. */
  const { error: zeilenFehler } = await service.from("bonitaetsnachweise").upsert(
    {
      anfrage_id: link.anfrage_id,
      objekt_id: link.objekt_id,
      user_id: link.user_id,
      art,
      datei_pfad: pfad,
      datei_name: datei.name.slice(0, 200),
      groesse_bytes: datei.size,
      einwilligung_verarbeitung: true,
      einwilligung_auskunftei: einwilligungAuskunftei,
      einwilligung_am: new Date().toISOString(),
      loeschen_ab: loeschenAb.toISOString(),
      hochgeladen_am: new Date().toISOString(),
      status: "eingegangen",
      geprueft_am: null,
      geprueft_von: null,
      geprueft_rolle: null,
      unbrauchbar_grund: null,
    },
    { onConflict: "anfrage_id,art" }
  );
  if (zeilenFehler) {
    /* Die Datei liegt schon, die Zeile fehlt: Nur die NEUE Datei
       wieder wegraeumen. Der alte Nachweis steht unveraendert, samt
       seiner Datei; der Interessent verliert nichts. */
    /* DASS DAS WEGRAEUMEN GELINGT, WIRD SEIT DEM 31.08.2026 GEPRUEFT.
       Hier wiegt es am schwersten von allen: Ein Bonitaetsnachweis ist
       das Dokument eines Menschen, der nicht einmal unser Kunde ist,
       und er hat es uns nur fuer diesen einen Zweck gegeben. Bleibt die
       Datei ohne Zeile liegen, faellt sie aus jeder Loeschfrist, denn
       die Fristen laufen ueber die Tabellen. */
    const { data: entfernt, error: aufraeumFehler } = await service.storage
      .from(BONITAET_BUCKET)
      .remove([pfad]);
    if (aufraeumFehler || (entfernt ?? []).length === 0) {
      console.error(
        "[nachweis] Datei blieb liegen:",
        pfad,
        aufraeumFehler?.message ?? "nichts entfernt"
      );
      await melde({
        ereignis: "upload.fehlgeschlagen",
        empfaenger: { art: "admin" },
        kurztext:
          `Ein Bonitaetsnachweis liegt ohne Zeile im Speicher (${pfad}): ` +
          `${aufraeumFehler?.message ?? "das Wegraeumen entfernte nichts"}. Er faellt damit aus ` +
          `jeder Loeschfrist und gehoert von Hand entfernt.`,
        kennungen: {},
        adminPfad: "/admin/bieterverfahren",
      });
    }
    console.error("[nachweis] Eintrag fehlgeschlagen:", zeilenFehler);
    return NextResponse.json(
      { meldung: "Der Nachweis ließ sich nicht ablegen. Bitte versuchen Sie es erneut." },
      { status: 500 }
    );
  }

  /* JETZT ERST die ersetzte Datei wegraeumen: Die Zeile zeigt bereits
     auf die neue, hier kann nichts mehr dazwischen kommen. Scheitert
     das Aufraeumen, bleibt hoechstens eine Datei ohne Bezug liegen;
     die Loeschfristen (lib/loeschfristen.ts) nehmen sie mit, und der
     Nachweis des Interessenten steht. Der umgekehrte Fall waere der
     schlimme, und genau der war es bis heute. */
  const ersetzt = vorher.map((a) => a.datei_pfad).filter((p) => p !== pfad);
  if (ersetzt.length > 0) {
    const { error: aufraeumFehler } = await service.storage
      .from(BONITAET_BUCKET)
      .remove(ersetzt);
    if (aufraeumFehler) {
      console.error("[nachweis] Ersetzte Datei nicht entfernt:", aufraeumFehler);
      await melde({
        ereignis: "nachweis.eingegangen",
        empfaenger: { art: "admin" },
        kurztext:
          "Ein ersetzter Nachweis liegt noch im Speicher: Die neue Fassung ist eingetragen, die alte Datei liess sich nicht entfernen.",
        kennungen: { kunde: link.user_id, vorgang: link.anfrage_id },
        adminPfad: "/admin/kunden/" + link.user_id,
      });
    }
  }

  /* Den zustaendigen Makler benachrichtigen. Ohne Namen des
     Interessenten und ohne Art des Nachweises: Beides gehoert nicht
     auf ein privates Telefon. */
  await meldeFuerKunden(link.user_id, {
    ereignis: "nachweis.eingegangen",
    kurztext: "Ein Nachweis ist eingegangen",
    kennungen: { kunde: link.user_id, vorgang: link.anfrage_id },
    adminPfad: "/admin/kunden/" + link.user_id,
  });

  /* UND DEN VERKAEUFER, der den Nachweis angefordert hat. Bis zum
     13.08.2026 erfuhr er nichts: Der Interessent bekam seinen Beleg,
     das Team seine Meldung, und derjenige, der auf die Unterlage
     wartete, musste von selbst nachsehen. Ueber sendeHinweis(), damit
     die Abmeldung in den Einstellungen gilt. */
  /* Die Unterhaltung, in die der Knopf der Mail fuehren soll. Ein
     Fehlschlag hier laesst die Mail unveraendert in den Posteingang
     zeigen, statt sie ausfallen zu lassen. */
  const { data: anfrageZeile } = await service
    .from("anfragen")
    .select("interessent_id")
    .eq("id", link.anfrage_id)
    .maybeSingle<{ interessent_id: string | null }>();

  await sendeHinweis(service, link.user_id, "nachweis-hochgeladen", (empfaenger) =>
    nachweisHochgeladenMail({
      name: empfaenger.name,
      interessentName: link.empfaenger_name,
      interessentId: anfrageZeile?.interessent_id ?? null,
      bezeichnung: NACHWEIS_ARTEN.find((a) => a.id === art)?.label ?? "Nachweis",
    })
  );

  /* IN DIE GLOCKE (Runde 35). OHNE DEN NAMEN des Interessenten: Die
     Zeile kann auf einem Sperrbildschirm auftauchen, und wer wem
     etwas eingereicht hat, geht niemanden an, der zufaellig
     hinsieht. Der Name steht in der Akte, wohin die Meldung fuehrt. */
  await meldeDemKunden({
    kundeId: link.user_id,
    art: "nachweis.eingegangen",
    zeile: `Ein Interessent hat einen Nachweis eingereicht (${NACHWEIS_ARTEN.find((a) => a.id === art)?.label ?? "Nachweis"}). Sie können ihn in der Akte prüfen.`,
    kennungen: { anfrage: link.anfrage_id ?? "" },
  });

  /* Die Einwilligungen stehen seit Bau-Runde 9 GANZ VORN in dieser
     Route, festgeschrieben und geprueft, bevor die Datei angenommen
     wird. */
  await nutzungVermerken(link.id);

  // Bestaetigung an den Interessenten, damit er einen Beleg hat
    /* Kein "if (mailKonfiguriert())" davor: sendeMail() faengt den Fall
     selbst ab UND vermerkt ihn im Versandprotokoll. Mit der Abfrage
     davor blieb ein fehlender Schluessel eine stille Luecke, und ein
     fehlender Ausloeser sah genauso aus. */
  if (link.empfaenger_email) {
    const { data: objekt } = await service
      .from("objekte")
      .select("objektart, stadt")
      .eq("id", link.objekt_id)
      .maybeSingle();
    const o = objekt as { objektart?: string | null; stadt?: string | null } | null;
    const mail = nachweisEingegangenMail({
      name: link.empfaenger_name,
      objektBezeichnung:
        [o?.objektart ? OBJEKTART_LABELS[o.objektart as Objektart] : null, o?.stadt].filter(Boolean).join(" in ") || "Ihrer Anfrage",
      art: NACHWEIS_ARTEN.find((a) => a.id === art)?.label ?? "Nachweis",
    });
    /* Der Ausgang geht mit in die Antwort (24.08.2026): Die
       Erfolgsansicht behauptete fest "Eine Bestätigung haben wir Ihnen
       per E-Mail geschickt". Jetzt sagt sie das nur bei angenommenem
       Versand; siehe NachweisFormular. */
    const befund = await sendeMailMitBefund({
      an: link.empfaenger_email,
      betreff: mail.betreff,
      html: mail.html,
      text: mail.text,
      art: "benachrichtigung",
      vorlage: "nachweis-eingegangen",
      /* Eigentuemer ist der Verkaeufer, dem der Einmal-Link gehoert;
         damit greift der Vorfuehr-Riegel auch hier (24.08.2026). */
      userId: link.user_id,
    });
    return NextResponse.json({
      ok: true,
      bestaetigungVerschickt: befund.verschickt ? true : befund.gewollt ? null : false,
    });
  }

  return NextResponse.json({ ok: true, bestaetigungVerschickt: null });
}
