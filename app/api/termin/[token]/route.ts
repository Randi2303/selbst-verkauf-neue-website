import { NextResponse } from "next/server";
import { BREMS_SAETZE, GRENZEN, tuerVoll } from "@/lib/bremse";
import { linkPruefen } from "@/lib/einmal-link";
import { buchen } from "@/lib/verfuegbarkeit-server";

export const dynamic = "force-dynamic";

/**
 * Eine freie Zeit buchen, ohne Konto, über den persönlichen Link.
 *
 * DIE ROUTE ENTSCHEIDET NICHTS. Sie prüft das Token und reicht weiter
 * an buchen() in lib/verfuegbarkeit-server.ts. Dort und nur dort
 * stehen die drei Regeln, die nicht umgehbar sein dürfen: keine
 * Termine nach Verkauf oder Archivierung, kein Termin ohne
 * bestätigten Nachweis, wenn er Pflicht ist, und nur Zeiten aus dem
 * Raster des Verkäufers.
 *
 * DAS GILT AUCH BEIM DIREKTEN AUFRUF. Wer diese Adresse mit einem
 * beliebigen Zeitpunkt anspricht, kommt an denselben Prüfungen
 * vorbei wie jemand, der klickt; die Oberfläche ist nirgends die
 * Grenze.
 *
 * DAS TOKEN IST AN DIE PERSON GEBUNDEN, nicht an einen Termin. Wer
 * buchen darf, ist damit durch den Link bestimmt und nicht durch
 * etwas, das der Aufrufer mitschickt.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "buchung");
  if (!pruefung.gueltig) {
    return NextResponse.json(
      {
        meldung:
          "Dieser Link gilt nicht mehr. Schreiben Sie gern kurz zurück, dann bekommen Sie einen neuen.",
        grund: "link",
      },
      { status: 403 }
    );
  }
  const link = pruefung.link;
  if (!link.objekt_id || !link.ziel_id) {
    return NextResponse.json(
      { meldung: "Dieser Link gehört zu keinem Vorgang.", grund: "link" },
      { status: 400 }
    );
  }

  /* Jede erfolgreiche Buchung oder Verschiebung schickt zwei Mails
     samt Kalendereintrag und eine Team-Meldung. Die Grenze je Link
     und Tag (lib/bremse.ts) deckelt das Hin und Her. */
  if (tuerVoll("termin-buchen", link.id, GRENZEN.tueren.terminBuchenJeToken24h)) {
    return NextResponse.json(
      { meldung: BREMS_SAETZE.terminBuchen, grund: "eingabe" },
      { status: 429 }
    );
  }

  const daten = (await request.json().catch(() => null)) as {
    beginn?: string;
  } | null;
  const beginn = daten?.beginn ? new Date(daten.beginn) : null;
  if (!beginn || Number.isNaN(beginn.getTime())) {
    return NextResponse.json(
      { meldung: "Bitte wählen Sie eine Zeit aus.", grund: "eingabe" },
      { status: 400 }
    );
  }

  const ergebnis = await buchen({
    objektId: link.objekt_id,
    interessentId: link.ziel_id,
    beginn,
  });

  if (!ergebnis.ok) {
    /* BELEGT IST KEIN FEHLER, sondern der Normalfall bei zwei
       Interessenten. 409 statt 500, damit die Seite die uebrigen
       Zeiten nachladen und freundlich bleiben kann. */
    const status =
      ergebnis.grund === "belegt" ? 409 : ergebnis.grund === "fehler" ? 500 : 403;
    return NextResponse.json(
      { meldung: ergebnis.meldung, grund: ergebnis.grund },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    besichtigungId: ergebnis.besichtigungId,
    /* Damit die Seite "verschoben" statt "gebucht" sagen kann. Wer
       gerade seinen Samstag gegen den Dienstag getauscht hat, soll
       nicht lesen, sein Termin stehe jetzt, und sich fragen, welcher
       von beiden. */
    verschoben: ergebnis.verschoben ?? false,
  });
}
