import { NextResponse } from "next/server";
import { BREMS_SAETZE, GRENZEN, tuerVoll } from "@/lib/bremse";
import { linkPruefen } from "@/lib/einmal-link";
import { istFreigegeben } from "@/lib/link-freigabe";
import { supabaseService, UNTERLAGEN_BUCKET } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

/**
 * Liefert das Exposé-PDF fuer einen gueltigen persoenlichen Link,
 * NACH der Zwischenseite (Freigabe-Cookie). Inline zur Ansicht; dass
 * der Interessent es speichern kann, ist gewollt, es ist sein Exposé.
 * Kein Suchindex, keine Zwischenspeicher.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "expose");
  if (!pruefung.gueltig) {
    return NextResponse.json({ meldung: "Der Link gilt nicht mehr." }, { status: 404 });
  }
  if (!(await istFreigegeben(token))) {
    return NextResponse.json({ meldung: "Bitte über die Link-Seite öffnen." }, { status: 403 });
  }

  /* Jeder Abruf holt mehrere Megabyte aus dem Speicher und durch den
     Server. Die Grenze je Link und Tag (lib/bremse.ts) liegt weit
     ueber jedem Lesen und stoppt Herunterlade-Schleifen. */
  if (tuerVoll("expose-datei", pruefung.link.id, GRENZEN.tueren.exposeDateiJeToken24h)) {
    return NextResponse.json({ meldung: BREMS_SAETZE.exposeDatei }, { status: 429 });
  }
  const service = supabaseService();
  if (!service) {
    return NextResponse.json({ meldung: "Nicht verfügbar." }, { status: 503 });
  }
  const { data: objekt } = await service
    .from("objekte")
    .select("expose_pfad")
    .eq("id", pruefung.link.objekt_id ?? "")
    .maybeSingle<{ expose_pfad: string | null }>();
  if (!objekt?.expose_pfad) {
    return NextResponse.json({ meldung: "Das Exposé liegt nicht mehr bereit." }, { status: 404 });
  }
  const { data, error } = await service.storage
    .from(UNTERLAGEN_BUCKET)
    .download(objekt.expose_pfad);
  if (error || !data) {
    return NextResponse.json({ meldung: "Datei nicht gefunden." }, { status: 404 });
  }
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="expose.pdf"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
