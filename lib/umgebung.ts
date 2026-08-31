import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  UMGEBUNGS_KATEGORIEN,
  schulArt,
  type UmgebungsKategorieId,
  type Umgebungspunkt,
} from "@/config/umgebung";

/**
 * Die Umgebungs-Abfrage bei Overpass (OpenStreetMap), NUR serverseitig
 * und NUR auf Knopfdruck des Verkäufers (app/api/umgebung). Besucher
 * lösen nie einen Abruf aus; das Ergebnis liegt in umgebungspunkte.
 *
 * NUTZUNGSREGELN der öffentlichen Overpass-Instanzen (Stand 18.08.2026,
 * dev.overpass-api.de/overpass-doc): fair use um 10.000 Abfragen und
 * 1 GB je Tag, Kennung über die IP, 429/504 bei Überlastung. Wir
 * liegen mit EINER Abfrage je Objekt und Knopfdruck weit darunter.
 * Der User-Agent nennt uns trotzdem, wie bei Nominatim
 * (lib/geokodierung). ZWEI Dinge, am 18.08.2026 gemessen:
 *   - Je Nutzer (bei uns: die SERVER-IP, also alle Kunden zusammen)
 *     gibt es 2 Slots und nach schweren Abfragen eine Abkühlzeit;
 *     schnelle Wiederholungen bekommen 504 und laufen hier in die
 *     ehrliche Meldung ("in ein paar Minuten noch einmal").
 *   - Eine volle Abfrage mitten in Münster brauchte 27 Sekunden.
 *     20 waren zu knapp, deshalb 40 je Anlauf.
 *
 * HÖCHSTDAUER: 40 Sekunden je Anlauf. Nach einem TIMEOUT wird
 * AUFGEGEBEN statt die zweite Instanz zu fragen (die Ursache ist dann
 * die Last oder die Schwere der Abfrage, nicht die Instanz, und ein
 * zweiter 40er-Anlauf spraengte die Wartezeit des Verkäufers). Nur
 * ein SCHNELLER Fehler (Netz, 429, 504, 5xx) versucht die zweite
 * Instanz. Schlimmster Fall damit rund 45 Sekunden, danach gibt die
 * Abfrage AUSDRÜCKLICH auf (ok: false mit Meldung). Keine
 * Warteschleife ohne Zeitlimit.
 *
 * Die Selektoren stehen HIER und nicht in config/umgebung.ts: Sie sind
 * Overpass-Syntax und damit Serversache; der Katalog in config trägt
 * alles, was Browser und Anzeige brauchen (Labels, Gruppen, Radien,
 * Obergrenzen, Namensregel).
 */

const OVERPASS_INSTANZEN = [
  "https://overpass-api.de/api/interpreter",
  // Zweiter Anlauf auf einer unabhängigen öffentlichen Instanz, damit
  // eine Wartung bei overpass-api.de nicht jede Abfrage scheitern lässt
  "https://overpass.kumi.systems/api/interpreter",
];

const USER_AGENT = "selbst-verkauf.de Umgebungsabfrage (hallo@selbst-verkauf.de)";

/** Höchstdauer je Anlauf; steht auch als [timeout:] in der Abfrage */
const HOECHSTDAUER_MS = 40000;

/** Harte Obergrenze über ALLE Anläufe zusammen */
const GESAMT_HOECHSTDAUER_MS = 45000;

/**
 * Was bei Overpass angefragt wird: je Zeile ein Tag-Filter mit dem
 * Radius der zugehörigen Kategorie. Die ZUORDNUNG zur Kategorie
 * passiert danach über passtZu(), weil ein Filter zwei Kategorien
 * bedienen kann (amenity=school trägt Grundschulen UND weiterführende
 * Schulen, getrennt über isced:level bzw. den Namen).
 */
const ABFRAGE_TEILE: { filter: string; radiusM: number; nurKnoten?: boolean }[] = [
  { filter: '["amenity"="kindergarten"]', radiusM: 2000 },
  { filter: '["amenity"="school"]', radiusM: 8000 },
  { filter: '["leisure"="playground"]', radiusM: 1500 },
  { filter: '["shop"="supermarket"]', radiusM: 3000 },
  { filter: '["shop"="bakery"]', radiusM: 2000 },
  { filter: '["amenity"="pharmacy"]', radiusM: 3000 },
  { filter: '["amenity"="doctors"]', radiusM: 3000 },
  { filter: '["healthcare"="doctor"]', radiusM: 3000 },
  { filter: '["amenity"="post_office"]', radiusM: 3000 },
  { filter: '["amenity"="parcel_locker"]', radiusM: 3000 },
  // Haltestellen und Anschlussstellen sind per Definition Punkte;
  // "node" statt "nwr" erspart dem Server die Flaechen-Suche
  { filter: '["highway"="bus_stop"]', radiusM: 1000, nurKnoten: true },
  { filter: '["railway"="station"]', radiusM: 10000 },
  { filter: '["railway"="halt"]', radiusM: 10000 },
  { filter: '["highway"="motorway_junction"]', radiusM: 15000, nurKnoten: true },
  { filter: '["leisure"="park"]', radiusM: 2500 },
  // Wald nur mit Namen: ein unbenanntes Flurstück Wald ist keine
  // Angabe, ein benannter Stadtwald schon
  { filter: '["natural"="wood"]["name"]', radiusM: 2500 },
  { filter: '["landuse"="forest"]["name"]', radiusM: 2500 },
  { filter: '["leisure"="sports_centre"]', radiusM: 5000 },
  { filter: '["leisure"="water_park"]', radiusM: 5000 },
  { filter: '["amenity"="restaurant"]', radiusM: 2000 },
  { filter: '["amenity"="cafe"]', radiusM: 2000 },
];

type OsmTags = Record<string, string>;

/**
 * Gehört ein OSM-Element (über seine Tags) zu dieser Kategorie?
 * Die Schulregel (Ausschlussliste, isced, Name) liegt als schulArt()
 * in config/umgebung.ts, EINE Quelle für Abfrage und Portalexport.
 */
const PASST_ZU: Record<UmgebungsKategorieId, (t: OsmTags) => boolean> = {
  kindergarten: (t) => t.amenity === "kindergarten",
  grundschule: (t) =>
    t.amenity === "school" &&
    schulArt(t.name, t["isced:level"]) === "grundschule",
  weiterfuehrende_schule: (t) =>
    t.amenity === "school" &&
    schulArt(t.name, t["isced:level"]) === "weiterfuehrend",
  spielplatz: (t) => t.leisure === "playground",
  supermarkt: (t) => t.shop === "supermarket",
  baecker: (t) => t.shop === "bakery",
  apotheke: (t) => t.amenity === "pharmacy",
  arzt: (t) => t.amenity === "doctors" || t.healthcare === "doctor",
  post: (t) => t.amenity === "post_office" || t.amenity === "parcel_locker",
  bushaltestelle: (t) => t.highway === "bus_stop",
  bahnhof: (t) => t.railway === "station" || t.railway === "halt",
  autobahn: (t) => t.highway === "motorway_junction",
  park_wald: (t) =>
    t.leisure === "park" || t.natural === "wood" || t.landuse === "forest",
  sport_schwimmbad: (t) =>
    t.leisure === "sports_centre" || t.leisure === "water_park",
  restaurant_cafe: (t) => t.amenity === "restaurant" || t.amenity === "cafe",
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
};

export type UmgebungsVorschlag = {
  kategorie: UmgebungsKategorieId;
  name: string;
  entfernungM: number;
  osmKennung: string;
};

export type UmgebungsErgebnis =
  | { ok: true; punkte: UmgebungsVorschlag[] }
  | { ok: false; meldung: string };

/** Luftlinie in Metern (Haversine) */
export function luftlinieM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function overpassAbfrageText(lat: number, lng: number): string {
  const statements = ABFRAGE_TEILE.map(
    (t) =>
      `  ${t.nurKnoten ? "node" : "nwr"}${t.filter}(around:${t.radiusM},${lat},${lng});`
  ).join("\n");
  return `[out:json][timeout:${Math.floor(HOECHSTDAUER_MS / 1000)}];\n(\n${statements}\n);\nout center;`;
}

/**
 * EINE Abfrage für alle Kategorien. Gibt bei jedem Scheitern ok: false
 * mit einem Satz zurück, der dem Verkäufer sagt, woran es lag; nichts
 * scheitert still.
 */
export async function umgebungAbfragen(
  lat: number,
  lng: number
): Promise<UmgebungsErgebnis> {
  const abfrage = overpassAbfrageText(lat, lng);
  const start = Date.now();

  for (const instanz of OVERPASS_INSTANZEN) {
    /* Die harte Gesamt-Obergrenze verteilt sich auf die Anläufe: Wer
       spaet drankommt, bekommt nur den Rest; unter 5 Sekunden Rest
       lohnt kein Anlauf mehr. */
    const rest = GESAMT_HOECHSTDAUER_MS - (Date.now() - start);
    if (rest < 5000) break;
    const anlaufMs = Math.min(HOECHSTDAUER_MS, rest);
    const abbruch = new AbortController();
    const wecker = setTimeout(() => abbruch.abort(), anlaufMs);
    try {
      const antwort = await fetch(instanz, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(abfrage)}`,
        signal: abbruch.signal,
      });
      if (!antwort.ok) {
        /* 429/504 sind die Abkuehl- und Lastantworten der Instanz;
           jede wird EINZELN protokolliert, damit der Betrieb sieht,
           welche Instanz woran scheiterte */
        console.error(`[umgebung] ${instanz}: Status ${antwort.status}`);
        continue;
      }
      const daten = (await antwort.json()) as { elements?: OverpassElement[] };
      return {
        ok: true,
        punkte: verarbeite(daten.elements ?? [], lat, lng),
      };
    } catch (fehler) {
      // wirkung: gewollt kein throw, der naechste Anlauf ist die
      // Behandlung; scheitern alle, endet die Funktion unten mit
      // ok:false samt Meldung an den Verkaeufer
      const timeout = fehler instanceof Error && fehler.name === "AbortError";
      console.error(
        `[umgebung] ${instanz}:`,
        timeout
          ? `keine Antwort innerhalb von ${Math.round(anlaufMs / 1000)} Sekunden`
          : fehler instanceof Error
            ? fehler.message
            : String(fehler)
      );
    } finally {
      clearTimeout(wecker);
    }
  }

  // Das AUSDRÜCKLICHE Aufgeben; die Anlaeufe stehen einzeln im Protokoll
  console.error("[umgebung] Overpass-Abfrage aufgegeben");
  return {
    ok: false,
    meldung:
      "Der Kartendienst hat gerade nicht geantwortet. Ihre Angaben sind unverändert; bitte versuchen Sie es in ein paar Minuten noch einmal.",
  };
}

/**
 * Aus der rohen Overpass-Antwort die Vorschlagsliste: je Kategorie die
 * nächstgelegenen Treffer im Katalog-Radius, gleiche Namen nur einmal
 * (eine Bushaltestelle hat zwei Richtungen, eine Anschlussstelle
 * mehrere Knoten), Obergrenze je Kategorie aus dem Katalog.
 */
function verarbeite(
  elemente: OverpassElement[],
  lat: number,
  lng: number
): UmgebungsVorschlag[] {
  const mitOrt = elemente
    .map((e) => {
      const eLat = e.lat ?? e.center?.lat;
      const eLon = e.lon ?? e.center?.lon;
      if (eLat == null || eLon == null || !e.tags) return null;
      return {
        tags: e.tags,
        kennung: `${e.type}/${e.id}`,
        entfernungM: luftlinieM(lat, lng, eLat, eLon),
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const vorschlaege: UmgebungsVorschlag[] = [];
  for (const kategorie of UMGEBUNGS_KATEGORIEN) {
    const passt = PASST_ZU[kategorie.id];
    const gesehen = new Set<string>();
    const treffer = mitOrt
      .filter((e) => e.entfernungM <= kategorie.radiusM && passt(e.tags))
      .sort((a, b) => a.entfernungM - b.entfernungM);
    for (const t of treffer) {
      if (gesehen.size >= kategorie.hoechstens) break;
      const name = (t.tags.name ?? t.tags.brand ?? "").trim() || kategorie.ohneNamen;
      if (!name) continue;
      if (gesehen.has(name)) continue;
      gesehen.add(name);
      vorschlaege.push({
        kategorie: kategorie.id,
        name,
        entfernungM: t.entfernungM,
        osmKennung: t.kennung,
      });
    }
  }
  return vorschlaege;
}

/**
 * Die Punkte eines Objekts laden, mit dem Client des Aufrufers: die
 * Kunden-Seiten geben den angemeldeten Client (RLS), Objektseite und
 * Export die Dienst-Rolle. Ein Datenbank-Fehler wird GEWORFEN, nie zu
 * einer stillen leeren Liste: Sonst verschwänden bestätigte Angaben
 * wortlos aus Exposé und Export.
 */
export async function umgebungspunkteLaden(
  client: SupabaseClient,
  objektId: string
): Promise<Umgebungspunkt[]> {
  const { data, error } = await client
    .from("umgebungspunkte")
    .select("id, objekt_id, kategorie, name, entfernung_m, status, quelle, osm_kennung")
    .eq("objekt_id", objektId);
  if (error) throw new Error(`Umgebungspunkte nicht lesbar: ${error.message}`);
  return (data ?? []) as Umgebungspunkt[];
}
