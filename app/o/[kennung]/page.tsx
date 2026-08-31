import type { Metadata } from "next";
import ObjektseiteInhalt, {
  ObjektNichtVerfuegbar,
  ObjektVerkauft,
} from "@/components/objektseite/ObjektseiteInhalt";
import { ladeObjektseiteDaten } from "@/lib/objektseite-daten";
import type { Objekt } from "@/lib/objekt-felder";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Die OEFFENTLICHE Adresse der Objektseite (/o/<kennung>): nur mit
 * Freigabe des Verkaeufers, mit Anfrage-Formular, ohne Suchindex
 * (X-Robots-Tag hart aus next.config, dazu die Meta-Angabe, kein
 * Sitemap-Eintrag). Der Inhalt selbst ist geteilt mit den
 * persoenlichen Links und der Vorschau, siehe
 * components/objektseite/ObjektseiteInhalt.tsx.
 *
 * Unbekannte oder nicht freigegebene Kennungen zeigen eine
 * FREUNDLICHE Ansicht statt der nackten Fehlerseite: Ein alter
 * QR-Code auf einem Aushang soll niemanden vor eine Technikmeldung
 * stellen.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ObjektSeite({
  params,
}: {
  params: Promise<{ kennung: string }>;
}) {
  const { kennung } = await params;
  const service = supabaseService();
  if (!service) return <ObjektNichtVerfuegbar />;
  const { data: objekt } = await service
    .from("objekte")
    .select("*")
    .eq("seite_kennung", kennung)
    .eq("seite_freigegeben", true)
    .maybeSingle<Objekt & { verkauf_abgeschlossen_am: string | null }>();
  if (!objekt) return <ObjektNichtVerfuegbar />;

  if (objekt.verkauf_abgeschlossen_am) {
    return <ObjektVerkauft />;
  }

  const daten = await ladeObjektseiteDaten(objekt);
  return (
    <ObjektseiteInhalt
      objekt={objekt}
      daten={daten}
      formularKennung={kennung}
      pdfPfad={null}
    />
  );
}
