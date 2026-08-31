/**
 * Generische Abdeckungs- und Voraussetzungslogik für die Leistungsauswahl.
 *
 * Die Regeln selbst stehen ausschließlich in site.config.ts an den
 * Leistungen (Felder covers und requires, jeweils mit Pflicht-Begründung),
 * hier steht nur die Auswertung. Neue Regeln brauchen keine Code-Änderung.
 */
import { SERVICES, type SiteService } from "@/site.config";

export function getService(id: string): SiteService | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** Name im Dativ für Hinweistexte, fällt auf den normalen Namen zurück */
export function dativName(service: SiteService): string {
  return service.nameDativ ?? service.name;
}

/** Namen menschenlesbar verbinden: "A", "A und B", "A, B und C" */
export function namenListe(namen: readonly string[]): string {
  if (namen.length <= 1) return namen[0] ?? "";
  return `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1]}`;
}

/**
 * DECKT `abdecker` die Leistung `id` bei DIESER Objektart wirklich ab?
 *
 * =====================================================================
 * WARUM DIE OBJEKTART HIER MITZAEHLT (23.08.2026)
 * =====================================================================
 * `covers` nimmt eine einzeln gewaehlte Leistung aus dem Korb, mit dem
 * Satz "Wir haben sie entfernt, damit Sie nicht doppelt bezahlen". Der
 * Satz ist eine Zusicherung, und sie gilt nur, wenn der Abdecker sie
 * wirklich enthaelt.
 *
 * Als die Baulastenauskunft auch fuer Wohnungen buchbar wurde, war das
 * nicht mehr so: Der Unterlagen-Komplett-Service kostet bei einer
 * Wohnung 179 Euro, gerechnet aus 49 + 59 + 99, OHNE die 149 Euro der
 * Baulastenauskunft. Ohne diese Pruefung haette der Konfigurator sie
 * dem Wohnungsverkaeufer aus dem Korb genommen und ihm gesagt, sie sei
 * enthalten. Er haette bezahlt und sie nicht bekommen.
 *
 * OHNE OBJEKTART (Argument fehlt) gilt die Abdeckung wie bisher. Die
 * Leistungsseite ohne Objektbezug zeigt damit den allgemeinen Fall,
 * und das ist richtig: Dort ist noch nicht entschieden, was verkauft
 * wird.
 */
function deckt(
  abdecker: SiteService | undefined,
  id: string,
  objektart?: string | null
): boolean {
  if (!abdecker?.covers?.ids.includes(id)) return false;
  const nurBei = abdecker.covers.nurBei?.[id];
  if (!nurBei || !objektart) return true;
  return nurBei.includes(objektart);
}

/** Gewählte Leistung, die die gegebene bereits mit abdeckt, sonst null */
export function abgedecktDurch(
  id: string,
  selectedIds: ReadonlySet<string>,
  objektart?: string | null
): SiteService | null {
  for (const sid of selectedIds) {
    if (sid === id) continue;
    const s = getService(sid);
    if (deckt(s, id, objektart)) return s!;
  }
  return null;
}

/** Bereits gewählte Leistungen, die die neue Leistung mit abdecken würde */
export function abgedeckteAuswahl(
  id: string,
  selectedIds: ReadonlySet<string>,
  objektart?: string | null
): SiteService[] {
  const eigene = getService(id);
  return (eigene?.covers?.ids ?? [])
    .filter((cid) => selectedIds.has(cid))
    .filter((cid) => deckt(eigene, cid, objektart))
    .map((cid) => getService(cid))
    .filter((s): s is SiteService => Boolean(s));
}

/** Eine automatisch mitzubuchende Voraussetzung samt Begründung der Regel */
export type FehlendeVoraussetzung = {
  service: SiteService;
  /** Begründung aus der requires-Regel der anfordernden Leistung */
  reason: string;
};

/**
 * Noch nicht gewählte Voraussetzungen der Leistung, rekursiv aufgelöst.
 * Voraussetzungen von Voraussetzungen stehen zuerst, damit die
 * Buchungsreihenfolge fachlich stimmt. Ein Besucht-Set schützt vor
 * Zyklen in der Konfiguration.
 */
export function fehlendeVoraussetzungen(
  id: string,
  selectedIds: ReadonlySet<string>
): FehlendeVoraussetzung[] {
  const fehlend: FehlendeVoraussetzung[] = [];
  const besucht = new Set<string>([id]);
  const sammle = (sid: string) => {
    const regel = getService(sid)?.requires;
    if (!regel) return;
    for (const reqId of regel.ids) {
      if (besucht.has(reqId)) continue;
      besucht.add(reqId);
      if (selectedIds.has(reqId)) continue;
      sammle(reqId);
      const req = getService(reqId);
      if (req) fehlend.push({ service: req, reason: regel.reason });
    }
  };
  sammle(id);
  return fehlend;
}

/**
 * Gewählte Leistungen, die (auch über Zwischenschritte) auf der gegebenen
 * aufbauen. Wird die Leistung entfernt, müssen diese mit entfernt werden.
 */
export function abhaengigeAuswahl(
  id: string,
  selectedIds: ReadonlySet<string>
): SiteService[] {
  const entfernt = new Set<string>([id]);
  const abhaengig: SiteService[] = [];
  let gefunden = true;
  while (gefunden) {
    gefunden = false;
    for (const sid of selectedIds) {
      if (entfernt.has(sid)) continue;
      const s = getService(sid);
      if (s?.requires?.ids.some((reqId) => entfernt.has(reqId))) {
        entfernt.add(sid);
        abhaengig.push(s);
        gefunden = true;
      }
    }
  }
  return abhaengig;
}
