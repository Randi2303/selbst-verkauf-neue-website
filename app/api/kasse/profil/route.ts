import { NextResponse } from "next/server";
import { schreibe } from "@/lib/schreiben";
import { supabaseBereit } from "@/lib/supabase/bereit";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Eine Quelle fuer Rechnungsdaten (Punkt D6): Die Kasse belegt ihre
 * Felder aus dem Profil des angemeldeten Kunden vor (GET) und traegt
 * nach der Bestellung die Kassen-Angaben ins Profil, SOFERN dort noch
 * nichts steht (POST). Gefuellte Profilfelder werden nie
 * ueberschrieben, Aenderungen des Kunden haben immer Vorrang.
 * Ohne Anmeldung aendert sich am Kassen-Ablauf nichts.
 */
export async function GET() {
  if (!supabaseBereit) return NextResponse.json({ angemeldet: false });
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ angemeldet: false });

  const { data: profil } = await supabase
    .from("profiles")
    .select("vorname, nachname, name, telefon, strasse, plz, ort")
    .eq("id", user.id)
    .maybeSingle<{
      vorname: string | null;
      nachname: string | null;
      name: string | null;
      telefon: string | null;
      strasse: string | null;
      plz: string | null;
      ort: string | null;
    }>();
  return NextResponse.json({
    angemeldet: true,
    email: user.email ?? "",
    /* Beide Teile einzeln. name kommt zusaetzlich mit, weil die Kasse
       den Vergleich "steht im Konto etwas anderes" darauf stuetzt; es
       ist seit Migration 0035 eine abgeleitete Spalte und damit immer
       dasselbe wie die beiden Teile. */
    vorname: profil?.vorname ?? "",
    nachname: profil?.nachname ?? "",
    name: profil?.name ?? "",
    telefon: profil?.telefon ?? "",
    strasse: profil?.strasse ?? "",
    plz: profil?.plz ?? "",
    ort: profil?.ort ?? "",
  });
}

export async function POST(request: Request) {
  if (!supabaseBereit) return NextResponse.json({ ok: true });
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true });

  const daten = (await request.json().catch(() => null)) as {
    vorname?: string;
    nachname?: string;
    telefon?: string;
    strasse?: string;
    plz?: string;
    ort?: string;
  } | null;
  if (!daten) return NextResponse.json({ ok: true });

  const { data: profil } = await supabase
    .from("profiles")
    .select("vorname, nachname, telefon, strasse, plz, ort")
    .eq("id", user.id)
    .maybeSingle<{
      vorname: string | null;
      nachname: string | null;
      telefon: string | null;
      strasse: string | null;
      plz: string | null;
      ort: string | null;
    }>();

  /* Nur leere Profilfelder werden gefuellt, nichts wird ueberschrieben.
     name steht hier BEWUSST NICHT mehr in der Liste: Die Spalte wird
     seit Migration 0035 aus vorname und nachname abgeleitet und laesst
     sich nicht beschreiben. */
  const update: Record<string, string> = {};
  const felder = ["vorname", "nachname", "telefon", "strasse", "plz", "ort"] as const;
  for (const feld of felder) {
    const neu = daten[feld]?.trim();
    if (neu && !profil?.[feld]?.trim()) update[feld] = neu.slice(0, 200);
  }
  if (Object.keys(update).length > 0) {
    /* DIE RECHNUNGSADRESSE. Hier stand kein einziger Blick auf das
       Ergebnis: Schlug das Speichern fehl, lief die Kasse weiter und
       die Rechnung traege spaeter die falsche Anschrift. */
    const { ok, fehler, lautlos } = await schreibe(
      supabase.from("profiles").update(update).eq("id", user.id).select("id")
    );
    if (!ok) {
      console.error("[kasse] Profil nicht gespeichert:", fehler ?? "null Zeilen getroffen");
      return NextResponse.json(
        {
          meldung: lautlos
            ? "Ihre Rechnungsadresse ließ sich nicht speichern. Bitte melden Sie sich neu an und versuchen Sie es noch einmal."
            : "Ihre Rechnungsadresse ließ sich nicht speichern. Bitte versuchen Sie es gleich noch einmal.",
        },
        { status: 500 }
      );
    }
  }
  return NextResponse.json({ ok: true });
}
