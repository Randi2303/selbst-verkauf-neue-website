import "server-only";
import {
  ladeGrundrisseUndDokumente,
  ladeObjektFotos,
  type ObjektseiteDaten,
} from "@/components/objektseite/ObjektseiteInhalt";
import { bestaetigteUmgebung, type Umgebungspunkt } from "@/config/umgebung";
import { objektKoordinaten } from "@/lib/geokodierung";
import { umgebungspunkteLaden } from "@/lib/umgebung";
import type { Objekt } from "@/lib/objekt-felder";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Alles, was die Objektseite ueber die reine Objekt-Zeile hinaus
 * braucht, an EINER Stelle fuer alle drei Wege (oeffentlich,
 * persoenlicher Link, Vorschau): Fotos, Grundrisse, Unterlagen-Zeile,
 * Koordinaten, Umgebung und der VERKAEUFER als Ansprechweg.
 *
 * KEIN MAKLER MEHR (Festlegung des Inhabers, 25.08.2026): Der
 * begleitende Makler taucht nach aussen nirgends auf, er existiert
 * ausschliesslich im Konto des Kunden. Der fruehere Schalter
 * objekte.makler_auf_seite ist ersatzlos gefallen (Migration 0113).
 */
export async function ladeObjektseiteDaten(objekt: Objekt): Promise<ObjektseiteDaten> {
  /* Die 2000er der Ansicht und die Leisten-Fassungen stecken als noch
     NICHT eingeloeste Versprechen in den Galerie-Quellen; die Seite
     wartet nur auf die vollen Adressen und die 1600er des Titelbilds.
     Begruendung am Typ GalerieQuellen. */
  const [fotos, rest, koordinaten, verkaeufer, umgebung] = await Promise.all([
    ladeObjektFotos(objekt),
    ladeGrundrisseUndDokumente(objekt),
    objektKoordinaten(objekt),
    ladeVerkaeufer(objekt),
    ladeUmgebung(objekt),
  ]);
  return { fotos, ...rest, koordinaten, verkaeufer, umgebung };
}

/**
 * Nur die BESTÄTIGTEN Umgebungspunkte (0088), über die Dienst-Rolle
 * wie alles auf dieser Seite. Ein Besucher soll bei einem
 * Datenbank-Fehler lieber keine Umgebungsliste sehen als eine
 * Fehlermeldung, dasselbe Muster wie bei den Koordinaten.
 */
async function ladeUmgebung(objekt: Objekt): Promise<Umgebungspunkt[]> {
  const service = supabaseService();
  if (!service || !objekt.id) return [];
  try {
    return bestaetigteUmgebung(await umgebungspunkteLaden(service, objekt.id));
  } catch (fehler) {
    // wirkung: gewollt still fuer den Besucher, die oeffentliche Seite
    // zeigt nie einen Fehler; das Protokoll traegt die Ursache
    console.error("[objektseite] Umgebung nicht lesbar:", fehler);
    return [];
  }
}

/**
 * Der Verkaeufer fuer den Abschnitt "Ihr Ansprechweg": NUR der
 * gepflegte Profilname. Keine Mailadresse und keine Telefonnummer,
 * und die E-Mail-Rueckfallebene des Anzeigenamens gilt hier bewusst
 * NICHT: Eine private Adresse hat auf einer teilbaren Seite nichts
 * verloren. Ohne gepflegten Namen traegt die Karte die neutrale
 * Eigentuemer-Formulierung.
 */
async function ladeVerkaeufer(objekt: Objekt): Promise<{ name: string } | null> {
  const service = supabaseService();
  if (!service) return null;
  const { data: profil } = await service
    .from("profiles")
    .select("name")
    .eq("id", objekt.user_id)
    .maybeSingle<{ name: string | null }>();
  const name = profil?.name?.trim();
  return name ? { name } : null;
}
