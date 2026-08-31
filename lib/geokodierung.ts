import "server-only";
import { supabaseService } from "@/lib/supabase/service";
import type { Objekt } from "@/lib/objekt-felder";

/**
 * Geokodierung fuer die Karte der Objektseite, ueber Nominatim
 * (OpenStreetMap). BEWUSST nur serverseitig und nur EINMAL je Objekt:
 * Das Ergebnis wird in objekte.lage_lat/lage_lng gemerkt, Besucher
 * loesen nie einen Abruf aus. lage_quelle haelt fest, was kodiert
 * wurde (Adresse oder nur Ort), damit ein Umschalten der
 * Adress-Freigabe neu kodiert.
 *
 * Nominatim ist kostenlos; die Nutzungsregeln verlangen einen
 * aussagekraeftigen User-Agent und hoechstens einen Abruf je Sekunde.
 * Beides ist hier eingehalten (ein Abruf je Objekt und Freigabe-Stand).
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

function quelleFuer(objekt: Objekt): { quelle: string; suche: string } | null {
  const ort = [objekt.plz, objekt.stadt].filter(Boolean).join(" ");
  if (!ort) return null;
  if (objekt.adresse_freigeben && objekt.strasse) {
    return { quelle: `adresse:${objekt.strasse}, ${ort}`, suche: `${objekt.strasse}, ${ort}, Deutschland` };
  }
  return { quelle: `ort:${ort}`, suche: `${ort}, Deutschland` };
}

/**
 * Der Quellen-Stempel der AKTUELLEN Adresse, fuer den
 * Adresswechsel-Vergleich der Umgebung (objekte.umgebung_quelle,
 * Migration 0090). Dieselbe Ableitung wie die Geokodierung selbst.
 */
export function lageQuelle(objekt: Objekt): string | null {
  return quelleFuer(objekt)?.quelle ?? null;
}

/**
 * Koordinaten liefern und bei Bedarf nachschlagen. Gibt null zurueck,
 * wenn (noch) nichts bestimmbar ist; die Seite zeigt dann einfach
 * keine Karte, nie einen Fehler.
 */
export async function objektKoordinaten(
  objekt: Objekt
): Promise<{ lat: number; lng: number; genau: boolean } | null> {
  /* Eine von Hand gesetzte Markierung (lage_quelle "hand") gewinnt
     IMMER: keine automatische Suche ueberschreibt sie. */
  if (objekt.lage_quelle === "hand" && objekt.lage_lat != null && objekt.lage_lng != null) {
    return { lat: objekt.lage_lat, lng: objekt.lage_lng, genau: true };
  }

  const ziel = quelleFuer(objekt);
  if (!ziel) return null;
  const genau = ziel.quelle.startsWith("adresse:");

  if (
    objekt.lage_lat != null &&
    objekt.lage_lng != null &&
    objekt.lage_quelle === ziel.quelle
  ) {
    return { lat: objekt.lage_lat, lng: objekt.lage_lng, genau };
  }

  try {
    const abbruch = new AbortController();
    const wecker = setTimeout(() => abbruch.abort(), 5000);
    const antwort = await fetch(
      `${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(ziel.suche)}`,
      {
        headers: {
          "User-Agent": "selbst-verkauf.de Objektseite (hallo@selbst-verkauf.de)",
        },
        signal: abbruch.signal,
      }
    );
    clearTimeout(wecker);
    if (!antwort.ok) return null;
    const daten = (await antwort.json()) as { lat?: string; lon?: string }[];
    const treffer = daten?.[0];
    if (!treffer?.lat || !treffer?.lon) return null;
    const lat = Number(treffer.lat);
    const lng = Number(treffer.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const service = supabaseService();
    if (service && objekt.id) {
      await service
        .from("objekte")
        .update({ lage_lat: lat, lage_lng: lng, lage_quelle: ziel.quelle })
        .eq("id", objekt.id);
    }
    return { lat, lng, genau };
  } catch {
    return null;
  }
}
