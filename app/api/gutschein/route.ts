import { NextResponse, type NextRequest } from "next/server";
import { berechneBestellung, type BestellEingabe } from "@/lib/bestellung";
import { gutscheinFinden } from "@/lib/gutschein";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Live-Pruefung eines Gutschein-Codes an der Kasse, ohne Neuladen und
 * ohne Reservierung: Die Kasse zeigt sofort Nachlass oder eine
 * freundliche, unterscheidbare Begruendung. Verbindlich wird der
 * Gutschein erst mit der Reservierung in /api/checkout; dort prueft
 * die Datenbank noch einmal wettlaufsicher.
 *
 * Der Browser schickt nur den Text des Codes und den Korb als
 * Kennungen; jeder Betrag entsteht serverseitig (lib/bestellung.ts).
 */
export async function POST(request: NextRequest) {
  const daten = (await request.json().catch(() => null)) as {
    code?: string;
    items?: BestellEingabe[];
    email?: string;
    instantPayment?: boolean;
  } | null;
  const service = supabaseService();
  if (!service) {
    return NextResponse.json({ meldung: "Gerade nicht möglich." }, { status: 503 });
  }
  const pruefung = await gutscheinFinden(service, daten?.code ?? "", daten?.email);
  if (!pruefung.ok) {
    return NextResponse.json({ gueltig: false, meldung: pruefung.meldung });
  }
  const rechnung = berechneBestellung(
    daten?.items ?? [],
    Boolean(daten?.instantPayment),
    pruefung.gutschein
  );
  if (!rechnung.ok) {
    return NextResponse.json({ gueltig: false, meldung: rechnung.meldung });
  }
  return NextResponse.json({
    gueltig: true,
    code: pruefung.gutschein.code,
    betrag: rechnung.bestellung.gutschein?.betrag ?? 0,
  });
}
