import { NextResponse } from "next/server";
import { BREMS_SAETZE, GRENZEN, tuerVoll } from "@/lib/bremse";
import { linkPruefen } from "@/lib/einmal-link";
import { freieZeitenFuerPerson } from "@/lib/verfuegbarkeit-server";

export const dynamic = "force-dynamic";

/**
 * Die freien Zeiten neu holen, nachdem eine vergeben wurde.
 *
 * WOZU ES DIESE ROUTE GIBT: Wer zu spät klickt, soll im selben Moment
 * sehen, was noch da ist. Eine Absage ohne frische Liste zeigt ins
 * Leere, und der Mensch klickt daneben noch einmal auf dieselbe
 * vergebene Zeit.
 *
 * DIESELBE PRÜFUNG WIE BEIM BUCHEN, nicht nur dieselben Daten: Wer
 * wegen der Nachweis-Pflicht nicht buchen darf, bekommt hier auch
 * keine Zeiten zu sehen, und zwar auch beim direkten Aufruf ohne
 * Oberfläche.
 *
 * NUR FREIE ZEITEN VERLASSEN DEN SERVER. Es gibt hier keine belegte
 * Zeit, keine Anzahl, keinen Namen; aus der Antwort lässt sich nicht
 * ablesen, wer sonst kommt. Das ist der Grund, warum der Interessent
 * die Verfügbarkeits-Tabellen nie selbst liest (Migration 0064): Aus
 * den Lücken im Raster wäre genau das ablesbar.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "buchung");
  if (!pruefung.gueltig || !pruefung.link.objekt_id || !pruefung.link.ziel_id) {
    return NextResponse.json({ tage: [] }, { status: 403 });
  }

  /* Nur Rechenzeit, deshalb eine weite Grenze (lib/bremse.ts): Die
     Seite laedt die Zeiten beim Aufbau und nach jedem
     Buchungsversuch, ehrliche Nutzung bleibt weit darunter. */
  if (tuerVoll("termin-frei", pruefung.link.id, GRENZEN.tueren.terminFreiJeToken24h)) {
    return NextResponse.json(
      { tage: [], meldung: BREMS_SAETZE.terminFrei, grund: "eingabe" },
      { status: 429 }
    );
  }

  const zeiten = await freieZeitenFuerPerson(
    pruefung.link.objekt_id,
    pruefung.link.ziel_id
  );
  if (!zeiten.erlaubt) {
    return NextResponse.json(
      { tage: [], meldung: zeiten.meldung, grund: zeiten.grund },
      { status: zeiten.grund === "fehler" ? 503 : 403 }
    );
  }

  return NextResponse.json({
    tage: zeiten.tage.map((t) => ({
      datum: t.datum,
      zeiten: t.zeiten.map((z) => z.beginn.toISOString()),
    })),
  });
}
