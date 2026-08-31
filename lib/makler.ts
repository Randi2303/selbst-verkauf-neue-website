import "server-only";
import { supabaseService } from "@/lib/supabase/service";

/**
 * Der zustaendige Makler eines Kunden, an einer Stelle.
 *
 * WARUM GENAU EINER: Ein Kunde soll wissen, wer fuer ihn zustaendig
 * ist, und ein Rueckruf soll bei diesem Menschen ankommen, nicht bei
 * beiden. Zwei Namen nebeneinander sind keine Zustaendigkeit, sondern
 * eine Adressliste.
 *
 * DIE ZUORDNUNG UEBERLEBT DAS ENDE DER BEGLEITUNG. profiles.betreuer_id
 * bleibt stehen, damit der Verlauf lesbar bleibt; ob die Karte im Konto
 * erscheint, haengt an der aktiven Buchung, nicht an dieser Spalte.
 *
 * DIE VERTRETUNG steckt in aktiverMakler(): Ist der Zustaendige bis
 * heute oder spaeter abwesend und hat jemanden eingetragen, uebernimmt
 * diese Person Sicht und Meldungen. Danach faellt es von selbst weg.
 */

export type MaklerProfil = {
  id: string;
  name: string | null;
  email: string | null;
  telefon: string | null;
  mobil: string | null;
  bild_pfad: string | null;
  n8n_kennung: string | null;
  abwesend_bis: string | null;
  vertretung_id: string | null;
};

const FELDER =
  "id, name, email, telefon, mobil, bild_pfad, n8n_kennung, abwesend_bis, vertretung_id";

/** Initialen als Ersatz, solange kein Bild hinterlegt ist */
export function initialen(name: string | null): string {
  const teile = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!teile.length) return "?";
  const erste = teile[0][0] ?? "";
  const letzte = teile.length > 1 ? (teile[teile.length - 1][0] ?? "") : "";
  /* Nach dem Grossschreiben kappen: "ß" wird zu "SS", aus zwei
     Anfangsbuchstaben wuerden sonst drei oder vier Zeichen. */
  return (erste + letzte).toUpperCase().slice(0, 2);
}

/** Ist diese Person gerade abwesend? Taggenau, einschliesslich. */
export function istAbwesend(makler: Pick<MaklerProfil, "abwesend_bis">): boolean {
  if (!makler.abwesend_bis) return false;
  const heute = new Date().toISOString().slice(0, 10);
  return makler.abwesend_bis >= heute;
}

/**
 * Der eingetragene Makler eines Kunden, ohne Vertretungs-Logik.
 * Liest ueber die Service-Rolle, weil der Kunde das Profil seines
 * Maklers sonst nicht sehen duerfte.
 */
export async function zustaendigerMakler(
  kundeId: string
): Promise<MaklerProfil | null> {
  const service = supabaseService();
  if (!service) return null;

  const { data: kunde } = await service
    .from("profiles")
    .select("betreuer_id")
    .eq("id", kundeId)
    .maybeSingle<{ betreuer_id: string | null }>();
  if (!kunde?.betreuer_id) return null;

  const { data } = await service
    .from("profiles")
    .select(FELDER)
    .eq("id", kunde.betreuer_id)
    .maybeSingle<MaklerProfil>();
  return data ?? null;
}

/**
 * Wer den Kunden GERADE betreut: der Zustaendige, oder waehrend seiner
 * Abwesenheit die Vertretung. Gibt beide zurueck, damit die Karte
 * ehrlich sagen kann, wen sie zeigt und warum.
 */
export async function aktiverMakler(kundeId: string): Promise<{
  zustaendig: MaklerProfil;
  vertretung: MaklerProfil | null;
} | null> {
  const zustaendig = await zustaendigerMakler(kundeId);
  if (!zustaendig) return null;
  if (!istAbwesend(zustaendig) || !zustaendig.vertretung_id) {
    return { zustaendig, vertretung: null };
  }
  const service = supabaseService();
  if (!service) return { zustaendig, vertretung: null };
  const { data } = await service
    .from("profiles")
    .select(FELDER)
    .eq("id", zustaendig.vertretung_id)
    .maybeSingle<MaklerProfil>();
  return { zustaendig, vertretung: data ?? null };
}

/**
 * Welche dieser Kennungen gehoeren einem MAKLER, und wie heisst er.
 *
 * FUER DIE URHEBER-ANZEIGE IM KONTO (Bau-Runde 4): Der Kunde soll
 * sehen, dass sein Makler geantwortet oder einen Termin bearbeitet
 * hat, und nicht das Team. `nachrichten.gesendet_von` und
 * `termin_anfragen.bearbeitet_von` tragen die Kennung; das Profil
 * dahinter darf der Kunde per RLS nicht lesen, deshalb loest der
 * SERVER den Namen auf, wie bei der Makler-Karte auch.
 *
 * NUR MAKLER KOMMEN ZURUECK. Ein Admin in der Liste bleibt draussen
 * und erscheint dem Kunden weiter als "Ihr Team": Die Namen des Teams
 * gehen den Kunden nichts an, und genau diese Unterscheidung ist der
 * Zweck der Anzeige. Aufgeloest wird auch ein Makler, der laengst
 * nicht mehr zustaendig ist: In einem alten Verlauf soll der Name
 * stehen, der damals galt.
 */
export async function maklerNamenFuer(
  ids: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const eindeutig = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (eindeutig.length === 0) return {};
  const service = supabaseService();
  if (!service) return {};
  const { data } = await service
    .from("profiles")
    .select("id, name")
    .in("id", eindeutig)
    .eq("rolle", "makler")
    .returns<{ id: string; name: string | null }[]>();
  const namen: Record<string, string> = {};
  for (const p of data ?? []) {
    if (p.name) namen[p.id] = p.name;
  }
  return namen;
}

/** Alle Makler-Konten, fuer die Auswahl im Admin */
export async function alleMakler(): Promise<MaklerProfil[]> {
  const service = supabaseService();
  if (!service) return [];
  const { data } = await service
    .from("profiles")
    .select(FELDER)
    .eq("rolle", "makler")
    .order("name");
  return (data ?? []) as MaklerProfil[];
}

/** Die oeffentliche Adresse eines hinterlegten Bildes */
export function bildAdresse(pfad: string | null): string | null {
  if (!pfad) return null;
  const basis = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!basis) return null;
  return `${basis}/storage/v1/object/public/makler/${pfad}`;
}

/**
 * Die kleine Fassung fuers Portrait (Supabase-Umrechnung, Muster der
 * Ladezeiten-Runde vom 18.08.2026): Ein 48-px-Kreis braucht keine
 * 530-kB-Datei. Die Umrechnung ist ein eigener Endpunkt und kann
 * ausfallen, deshalb zeigt MaklerPortrait sie NUR mit Rueckfall auf
 * die volle Adresse und danach auf die Initialen.
 */
export function bildAdresseKlein(pfad: string | null): string | null {
  if (!pfad) return null;
  const basis = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!basis) return null;
  return `${basis}/storage/v1/render/image/public/makler/${pfad}?width=96&height=96&resize=cover&quality=80`;
}
