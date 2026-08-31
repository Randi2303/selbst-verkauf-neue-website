import { NextResponse, type NextRequest } from "next/server";
import { stripeClient } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Stand einer Bestellung fuer die Danke-Seite.
 *
 * Die Wahrheit kommt aus ZWEI Quellen: die Session direkt von Stripe
 * (hat die Zahlung geklappt?) und unsere Bestell-Zeile (hat der
 * Webhook schon verarbeitet?). Kommt die Rueckmeldung von Stripe
 * verspaetet, sieht der Kunde auf der Danke-Seite den ehrlichen
 * Wartezustand statt einer geratenen Erfolgsmeldung.
 *
 * Es wird nichts Persoenliches herausgegeben: nur Zustaende. Wer die
 * Session-Kennung kennt, kennt sie aus dem eigenen Bezahlvorgang.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ meldung: "Ungültige Anfrage." }, { status: 400 });
  }
  const stripe = stripeClient();
  const service = supabaseService();
  if (!stripe || !service) {
    return NextResponse.json({ meldung: "Gerade nicht möglich." }, { status: 503 });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const { data: bestellung } = await service
      .from("bestellungen")
      .select("status, konto_bestand, bestaetigung_verschickt_am")
      .eq("stripe_session_id", sessionId)
      .maybeSingle<{
        status: string;
        konto_bestand: boolean | null;
        bestaetigung_verschickt_am: string | null;
      }>();
    return NextResponse.json({
      session: session.status,
      zahlung: session.payment_status,
      bestellung: bestellung?.status ?? null,
      kontoBestand: bestellung?.konto_bestand ?? null,
      mailVerschickt: Boolean(bestellung?.bestaetigung_verschickt_am),
    });
  } catch {
    return NextResponse.json({ meldung: "Vorgang nicht gefunden." }, { status: 404 });
  }
}
