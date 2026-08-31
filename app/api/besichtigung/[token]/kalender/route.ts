import {
  besichtigungDateiname,
  besichtigungKalenderDatei,
} from "@/lib/kalender-datei";
import { ortFuerInteressent, type Besichtigung } from "@/lib/besichtigungen";
import { linkPruefen } from "@/lib/einmal-link";
import { objektBezeichnung } from "@/lib/objekt-felder";
import { supabaseService } from "@/lib/supabase/service";
import { siteConfig } from "@/site.config";

/**
 * Die Kalenderdatei fuer den INTERESSENTEN, ueber seinen Einmal-Link.
 *
 * Der Ort laeuft durch ortFuerInteressent(): Solange nur ein Vorschlag
 * offen ist, steht in der Datei Postleitzahl und Ort, nicht die
 * Strasse. Der Kalendereintrag ist kein Schlupfloch an der Zusage
 * vorbei.
 */
export async function GET(
  anfrage: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const terminId = new URL(anfrage.url).searchParams.get("termin") ?? "";

  const pruefung = await linkPruefen(token, "besichtigung");
  if (!pruefung.gueltig) {
    return new Response("Dieser Link gilt nicht mehr.", { status: 403 });
  }
  const service = supabaseService();
  if (!service) return new Response("Gerade nicht möglich.", { status: 503 });

  // Auch hier ist die Einladung der Ausweis, nicht das Token allein
  const { data: einladung } = await service
    .from("besichtigungs_einladungen")
    .select("besichtigung_id")
    .eq("besichtigung_id", terminId)
    .eq("interessent_id", pruefung.link.ziel_id ?? "")
    .maybeSingle<{ besichtigung_id: string }>();
  if (!einladung) {
    return new Response("Zu diesem Termin liegt keine Einladung für Sie vor.", {
      status: 404,
    });
  }

  const { data: daten } = await service
    .from("besichtigungen")
    .select("*")
    .eq("id", einladung.besichtigung_id)
    .maybeSingle();
  const termin = daten as Besichtigung | null;
  if (!termin) return new Response("Diesen Termin gibt es nicht mehr.", { status: 404 });

  const { data: objekt } = await service
    .from("objekte")
    .select("objektart, stadt, strasse, plz")
    .eq("id", termin.objekt_id)
    .maybeSingle<{
      objektart: string | null;
      stadt: string | null;
      strasse: string | null;
      plz: string | null;
    }>();

  const inhalt = besichtigungKalenderDatei(
    {
      id: termin.id,
      beginn: termin.beginn,
      dauer_minuten: termin.dauer_minuten,
      status: termin.status,
      folge: termin.folge,
      ort: objekt
        ? ortFuerInteressent(objekt, termin)
        : "Wird noch mitgeteilt",
      objektBezeichnung: objektBezeichnung(objekt ?? {}),
      art: termin.art,
      // Sein eigener Einmal-Link, also derselbe zeitlich begrenzte und
      // zweckgebundene Zugang wie in der Mail.
      absageLink: `${siteConfig.domain}/besichtigung/${token}`,
      ansprechpartner: `selbst-verkauf.de, ${siteConfig.mailAbsender.antwort}`,
    },
    "interessent"
  );

  return new Response(inhalt, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${besichtigungDateiname(termin)}"`,
      "Cache-Control": "no-store",
    },
  });
}
