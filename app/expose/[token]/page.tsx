import type { Metadata } from "next";
import LinkFehler from "@/components/nachweis/LinkFehler";
import Zwischenseite from "@/components/einmal-link/Zwischenseite";
import ObjektseiteInhalt, {
  ObjektVerkauft,
} from "@/components/objektseite/ObjektseiteInhalt";
import { ladeObjektseiteDaten } from "@/lib/objektseite-daten";
import { linkPruefen, nutzungVermerken } from "@/lib/einmal-link";
import { istFreigegeben } from "@/lib/link-freigabe";
import type { Objekt } from "@/lib/objekt-felder";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Der persoenliche Zugang zur Objektseite (/expose/<token>): fuer
 * Interessenten mit ihrem Link aus der Mail und fuer den Teilen-Link
 * des Verkaeufers. Beide zeigen DIESELBE Seite wie die oeffentliche
 * Adresse, nur ohne Anfrage-Formular und mit dem Expose-PDF als
 * Download daneben; das PDF ist eine andere Form derselben Seite.
 *
 * Die Zwischenseite davor haelt Mail-Pruefdienste ab, damit
 * "geoeffnet" in der Akte einen Menschen meint. Der Zugang braucht
 * KEINE Freigabe der oeffentlichen Seite: Teilen und persoenliche
 * Links gehen bewusst schon vor der Veroeffentlichung.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ihr Exposé",
  robots: { index: false, follow: false },
};

export default async function ExposeLinkSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pruefung = await linkPruefen(token, "expose");
  if (!pruefung.gueltig) {
    return <LinkFehler grund={pruefung.grund} />;
  }

  if (!(await istFreigegeben(token))) {
    return (
      <Zwischenseite
        titel="Ihr Exposé liegt bereit."
        text="Über diesen persönlichen Link öffnen Sie das Exposé mit allen Angaben, Fotos und Grundrissen, auf Wunsch auch als PDF. Ein Klick, dann sind Sie drin."
        knopf="Exposé öffnen"
        ziel="/api/link-oeffnen"
        felder={{ zweck: "expose", token }}
      />
    );
  }

  const service = supabaseService();
  const link = pruefung.link;

  // Erstes Oeffnen durch einen Menschen festhalten (fuer den Verlauf
  // der Akte); jede weitere Nutzung zaehlt nur den Zaehler hoch
  if (service) {
    /* wirkung: gewollt still, dies ist eine Verlaufszeile und kein Merker, der etwas sperrt. Ein Fehlschlag kostet den Zeitpunkt in der Akte; das Exposé darf daran nie scheitern, und die Nutzung selbst zaehlt nutzungVermerken direkt darunter. */
    await service
      .from("einmal_links")
      .update({ geoeffnet_am: new Date().toISOString() })
      .eq("id", link.id)
      .is("geoeffnet_am", null);
  }
  await nutzungVermerken(link.id);

  const { data: objekt } = service
    ? await service
        .from("objekte")
        .select("*")
        .eq("id", link.objekt_id ?? "")
        .maybeSingle<Objekt & { verkauf_abgeschlossen_am: string | null }>()
    : { data: null };
  if (!objekt) {
    return <LinkFehler grund="unbekannt" />;
  }
  if (objekt.verkauf_abgeschlossen_am) {
    return <ObjektVerkauft />;
  }

  const daten = await ladeObjektseiteDaten(objekt);
  return (
    <ObjektseiteInhalt
      objekt={objekt}
      daten={daten}
      formularKennung={null}
      pdfPfad={
        objekt.expose_pfad ? `/api/expose/datei/${encodeURIComponent(token)}` : null
      }
    />
  );
}
