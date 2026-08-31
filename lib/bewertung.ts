/**
 * Bewertungs-Logik: eine Datenquelle, keine Doppeleingabe.
 *
 * Die Bewertung nutzt ausschließlich die Objekt-Felder aus der
 * Erfassung. Hier steht, welche Felder dafür nötig sind
 * ("Bewertungs-bereit"), wie der Eingabe-Schnappschuss einer fertigen
 * Bewertung aussieht und wann eine Bewertung als nicht mehr aktuell
 * gilt (bewertungsrelevante Felder wurden danach geändert).
 *
 * Die Markteinschätzung selbst entsteht später server-seitig über die
 * Sprengnetter-Anbindung und landet in der Tabelle bewertungen,
 * TODO Sprengnetter-Anbindung.
 */
import { feldGefuellt, FELD_ZUORDNUNGEN } from "@/lib/openimmo-mapping";
import { feldSichtbar, type Objekt } from "@/lib/objekt-felder";
import type { SrcErgebnis } from "@/lib/sprengnetter";

/** Zeile der Tabelle bewertungen */
export type Bewertung = {
  id: string;
  objekt_id: string;
  user_id: string;
  spanne_min: number | null;
  spanne_max: number | null;
  quelle: string;
  status: "in_vorbereitung" | "fertig";
  eingabe_snapshot: Record<string, unknown> | null;
  /** Normalisierte Report-Strukturdaten für die Anzeige (Migration 0004) */
  quelle_daten: SrcErgebnis | null;
  /** Ablageort des Report-PDFs im privaten Storage (Migration 0004) */
  pdf_pfad: string | null;
  erstellt_am: string;
};

/**
 * Bewertungsrelevante Felder. Pflicht bedeutet: ohne diese Angabe ist
 * keine seriöse Preisspanne möglich. Die übrigen verbessern das
 * Ergebnis und fließen in den Schnappschuss ein.
 */
const BEWERTUNGS_FELDER: { feld: keyof Objekt & string; pflicht: boolean }[] = [
  { feld: "objektart", pflicht: true },
  { feld: "objekttyp", pflicht: true },
  { feld: "plz", pflicht: true },
  { feld: "stadt", pflicht: true },
  { feld: "strasse", pflicht: false },
  { feld: "wohnflaeche_qm", pflicht: true },
  { feld: "grundstuecksflaeche_qm", pflicht: true },
  { feld: "zimmer", pflicht: true },
  { feld: "baujahr", pflicht: true },
  { feld: "zustand", pflicht: true },
  { feld: "modernisierung_jahr", pflicht: false },
  { feld: "ausstattungsqualitaet", pflicht: false },
  { feld: "energieeffizienzklasse", pflicht: false },
];

function relevanteFelder(objekt: Objekt) {
  return BEWERTUNGS_FELDER.filter((f) =>
    feldSichtbar(f.feld, objekt.objektart)
  );
}

export type BewertungsBereitschaft = {
  bereit: boolean;
  fehlend: { feld: string; label: string }[];
};

/** Fehlen noch Pflichtangaben für die Bewertung? */
export function bewertungsBereitschaft(objekt: Objekt): BewertungsBereitschaft {
  const fehlend = relevanteFelder(objekt)
    .filter((f) => f.pflicht && !feldGefuellt(objekt, f.feld))
    .map((f) => ({
      feld: f.feld,
      label:
        FELD_ZUORDNUNGEN.find((z) => z.feld === f.feld)?.label ?? f.feld,
    }));
  return { bereit: fehlend.length === 0, fehlend };
}

/**
 * Schnappschuss der bewertungsrelevanten Feldwerte. Wird beim Anlegen
 * einer Bewertung server-seitig gespeichert und dient dem Abgleich.
 */
export function bewertungsSnapshot(objekt: Objekt): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const f of relevanteFelder(objekt)) {
    snapshot[f.feld] = objekt[f.feld] ?? null;
  }
  return snapshot;
}

/**
 * Nicht mehr aktuell: mindestens ein bewertungsrelevantes Feld weicht
 * vom Schnappschuss der Bewertung ab. Liefert die geänderten Felder
 * für einen ehrlichen Hinweis.
 */
export function bewertungVeraltet(
  bewertung: Bewertung,
  objekt: Objekt
): { veraltet: boolean; geaendert: string[] } {
  if (!bewertung.eingabe_snapshot) return { veraltet: false, geaendert: [] };
  const geaendert: string[] = [];
  for (const f of relevanteFelder(objekt)) {
    const alt = bewertung.eingabe_snapshot[f.feld] ?? null;
    const neu = objekt[f.feld] ?? null;
    if (JSON.stringify(alt) !== JSON.stringify(neu)) {
      geaendert.push(
        FELD_ZUORDNUNGEN.find((z) => z.feld === f.feld)?.label ?? f.feld
      );
    }
  }
  return { veraltet: geaendert.length > 0, geaendert };
}

/** Die neueste Bewertung zuerst */
export function neuesteBewertung(bewertungen: Bewertung[]): Bewertung | null {
  if (bewertungen.length === 0) return null;
  return [...bewertungen].sort((a, b) =>
    b.erstellt_am.localeCompare(a.erstellt_am)
  )[0];
}
