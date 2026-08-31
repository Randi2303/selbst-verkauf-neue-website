import "server-only";
import { FOTO_MAX_KANTE } from "@/lib/bilder";
import { supabaseService, UNTERLAGEN_BUCKET } from "@/lib/supabase/service";
import type { Unterlage } from "@/lib/unterlagen";

/**
 * Signierte Bild-Adressen mit WIEDERVERWENDUNG, in einer Stelle.
 *
 * ---------------------------------------------------------------------
 * WARUM ES DIESE SCHICHT GIBT (Ladezeiten-Runde, 18.08.2026)
 * ---------------------------------------------------------------------
 * Bis dahin signierte jede Auslieferung frisch, und jede frische
 * Signatur ist fuer Browser wie CDN eine NEUE Adresse: Der Cache blieb
 * dauerhaft kalt, ein Zweitbesuch der Objektseite lud das Titelbild
 * komplett neu (gemessen 2,5 MB), und jede Umrechnung wurde neu
 * gerechnet statt vom CDN beantwortet (gemessen 163 ms gegen 33 ms).
 * Die Supabase-Doku sagt es ausdruecklich: zwei Signaturen desselben
 * Objekts pflegen getrennte Cache-Eintraege.
 *
 * ---------------------------------------------------------------------
 * DAS HALBSTUNDEN-RASTER, und warum es den Schutz NICHT lockert
 * ---------------------------------------------------------------------
 * Signiert wird auf das Ende des NAECHSTEN Halbstunden-Fensters. Eine
 * ausgelieferte Adresse lebt damit zwischen 30 und 60 Minuten, nie
 * laenger als die Stunde, die vorher an jeder Stelle galt (Entscheidung
 * des Inhabers vom 18.08.2026: Wiederverwendung ja, Verlaengerung
 * nein, denn eine weitergeleitete Adresse funktioniert genau so lange).
 * Innerhalb des Fensters liefert der Speicher dieselbe Adresse wieder
 * aus, dadurch werden Browser-Cache und CDN zum ersten Mal warm.
 *
 * ---------------------------------------------------------------------
 * DIE GROESSEN
 * ---------------------------------------------------------------------
 * Die Umrechnung uebernimmt Supabase beim Ausliefern (laeuft auf dem
 * heutigen Tarif, abgerechnet je unterschiedlichem Quellbild und
 * Monat). Es gibt bewusst nur die vier Anzeige-Groessen aus der
 * Messung; wer eine neue braucht, traegt sie HIER ein und nirgendwo
 * sonst. Die Vollansicht ab Rechnerbreite und der interne Vergleich
 * Original gegen Verbessert bleiben die volle Datei; die Umrechnung
 * endet ohnehin bei 2500 px, unsere Originale haben bis 2560.
 *
 * WER EINE KLEINE FASSUNG ZEIGT, ZEIGT SIE MIT RUECKFALL: Die
 * Umrechnung ist ein eigener Endpunkt. Faellt er aus, kommt ein Fehler
 * statt eines Bildes, von selbst faellt nichts zurueck. Jedes Bild-
 * Element haengt deshalb an aufVolleDateiZurueckfallen
 * (components/foto/bild-rueckfall.ts) mit der vollen Adresse als Ziel.
 */

/** Die vier Anzeige-Groessen, gemessen begruendet (18.08.2026) */
export const BILD_BREITEN = {
  /** Leisten-Quadrate der Bildansicht, 60 px Anzeige bei bis zu dreifacher Dichte */
  leiste: 320,
  /** Galerie-Kacheln, gemessen 146 bis 217 px Anzeige bei bis zu dreifacher Dichte */
  kachel: 640,
  /**
   * Titelbild im Kasten "Ihr Objekt" auf der Uebersicht (21.08.2026).
   *
   * GEMESSEN: Die Karte ist bei 1440 px Fensterbreite rund 470 CSS-Pixel
   * breit (max-w-5xl, zwei Spalten, 20 px Abstand) und bei 390 px rund
   * 350. Bei doppelter Dichte braucht der groessere Fall also 940.
   * 640 waere dort sichtbar weich, 1600 waere gut viermal so viel Daten
   * wie noetig.
   *
   * Kostet nichts zusaetzlich: Die Umrechnung wird je unterschiedlichem
   * QUELLBILD und Monat abgerechnet, nicht je Groesse, und das erste
   * Foto ist als Titelbild der Objektmaske ohnehin schon bekannt.
   */
  karte: 960,
  /** Titelbild der Objektseite, gemessen 1068 bis 1102 echte Pixel */
  titel: 1600,
  /** Die geoeffnete Ansicht: hier sieht ein Interessent wirklich hin */
  ansicht: 2000,
} as const;

export type BildBreite = (typeof BILD_BREITEN)[keyof typeof BILD_BREITEN];

/** Halbstunden-Raster: ausgeliefert mit 30 bis 60 Minuten Rest */
const RASTER_SEKUNDEN = 1800;

function fenster(): { fensterEnde: number; expiresIn: number } {
  const jetzt = Math.floor(Date.now() / 1000);
  const fensterEnde = (Math.floor(jetzt / RASTER_SEKUNDEN) + 1) * RASTER_SEKUNDEN;
  return { fensterEnde, expiresIn: fensterEnde + RASTER_SEKUNDEN - jetzt };
}

/**
 * Der Wiederverwendungs-Speicher: je Fenster, Groesse und Pfad EIN
 * Versprechen. Auch parallele Anfragen derselben Adresse signieren
 * dadurch nur einmal. Begrenzt und selbstreinigend, damit er auf einem
 * lange laufenden Prozess nicht waechst.
 */
const speicher = new Map<string, { gueltigBisMs: number; url: Promise<string | null> }>();
const SPEICHER_DECKEL = 4000;

function aufraeumen(): void {
  const jetzt = Date.now();
  for (const [schluessel, eintrag] of speicher) {
    if (eintrag.gueltigBisMs <= jetzt) speicher.delete(schluessel);
  }
  if (speicher.size > SPEICHER_DECKEL) {
    // Aelteste zuerst weg; die Eintraege liegen in Einfuege-Reihenfolge
    for (const schluessel of speicher.keys()) {
      if (speicher.size <= SPEICHER_DECKEL) break;
      speicher.delete(schluessel);
    }
  }
}

function einzelnSignieren(pfad: string, breite: BildBreite | null): Promise<string | null> {
  const service = supabaseService();
  if (!service) return Promise.resolve(null);
  const { expiresIn } = fenster();
  const auftrag = breite
    ? service.storage.from(UNTERLAGEN_BUCKET).createSignedUrl(pfad, expiresIn, {
        transform: { width: breite, resize: "contain" },
      })
    : service.storage.from(UNTERLAGEN_BUCKET).createSignedUrl(pfad, expiresIn);
  return auftrag.then(
    ({ data, error }) => {
      if (error || !data?.signedUrl) {
        /* wirkung: gewollt sichtbar stattdessen: Ohne kleine Fassung faellt die Anzeige auf die volle Datei zurueck, ohne volle Adresse faellt das Bild sichtbar aus der Galerie; ein geloggtes Signatur-Problem darf die Seite nicht umwerfen. */
        console.error(`[bild-adressen] Signieren fehlgeschlagen (${pfad}, ${breite ?? "voll"}):`, error);
        return null;
      }
      return data.signedUrl;
    },
    (fehler) => {
      /* wirkung: gewollt sichtbar stattdessen: wie oben, der Rueckfall auf die volle Datei bzw. das fehlende Bild ist die sichtbare Antwort. */
      console.error(`[bild-adressen] Signieren fehlgeschlagen (${pfad}, ${breite ?? "voll"}):`, fehler);
      return null;
    }
  );
}

/**
 * Die Breite, in der eine Unterlage im Speicher LIEGT: eigene Uploads
 * werden auf FOTO_MAX_KANTE begrenzt, die KI-verbesserte Fassung
 * kommt in Upload-Aufloesung vom Anbieter. Null, wenn die Breite nie
 * erfasst wurde; dann wird im Zweifel umgerechnet.
 */
export function gespeicherteBreite(
  u: Pick<Unterlage, "breite" | "aktive_version" | "verbessert_pfad">
): number | null {
  if (u.breite == null) return null;
  const verbessertAktiv = u.aktive_version === "verbessert" && Boolean(u.verbessert_pfad);
  return verbessertAktiv ? u.breite : Math.min(u.breite, FOTO_MAX_KANTE);
}

/**
 * EINE Adresse in einer Anzeige-Groesse (Umrechnung beim Ausliefern).
 * Innerhalb des Halbstunden-Fensters kommt dieselbe Adresse wieder.
 *
 * MIT `quellBreite` UNTERBLEIBT DIE UMRECHNUNG, wenn sie nichts
 * verkleinern wuerde: Gemessen am 18.08.2026 macht sie eine Quelle,
 * die schon kleiner als die Zielbreite ist, um 18 bis 40 KB GROESSER
 * (Neukodierung mit Guete 80 ohne Gewinn). Die Antwort ist dann null,
 * und der Aufrufer zeigt die volle Datei, genau wie beim Rueckfall.
 */
export function kleineAdresse(
  pfad: string,
  breite: BildBreite,
  quellBreite?: number | null
): Promise<string | null> {
  if (quellBreite != null && quellBreite <= breite) return Promise.resolve(null);
  aufraeumen();
  const { fensterEnde } = fenster();
  const schluessel = `${fensterEnde}|${breite}|${pfad}`;
  const vorhanden = speicher.get(schluessel);
  if (vorhanden) return vorhanden.url;
  const url = einzelnSignieren(pfad, breite);
  speicher.set(schluessel, { gueltigBisMs: fensterEnde * 1000, url });
  return url;
}

/** Hoechstens so viele Einzel-Signaturen gleichzeitig */
const SIGNATUR_GLEICHZEITIG = 8;

/**
 * VIELE Adressen in einer Anzeige-Groesse. Die Buendel-Signatur nimmt
 * die Umrechnung nicht an (nachgemessen 13.08. und 18.08.2026), also
 * laufen Einzel-Signaturen parallel in Achtergruppen; zehn parallel
 * kosteten gemessen 426 ms, und dank Wiederverwendung faellt das je
 * Fenster nur einmal an. Gescheiterte Eintraege sind null.
 */
export async function kleineAdressen(
  pfade: string[],
  breite: BildBreite,
  quellBreiten?: (number | null)[]
): Promise<(string | null)[]> {
  const ergebnis: (string | null)[] = new Array(pfade.length).fill(null);
  for (let ab = 0; ab < pfade.length; ab += SIGNATUR_GLEICHZEITIG) {
    const gruppe = pfade.slice(ab, ab + SIGNATUR_GLEICHZEITIG);
    const urls = await Promise.all(
      gruppe.map((pfad, i) => kleineAdresse(pfad, breite, quellBreiten?.[ab + i]))
    );
    urls.forEach((url, i) => {
      ergebnis[ab + i] = url;
    });
  }
  return ergebnis;
}

/**
 * VOLLE Adressen im Buendel: EIN Aufruf fuer alle noch nicht im
 * Speicher liegenden Pfade. Antwort als Karte Pfad zu Adresse;
 * gescheiterte Pfade fehlen darin (wie bisher an den Aufrufstellen:
 * sie fallen sichtbar aus der Anzeige).
 */
export async function volleAdressen(pfade: string[]): Promise<Map<string, string>> {
  aufraeumen();
  const { fensterEnde, expiresIn } = fenster();
  const karte = new Map<string, string>();
  const fehlend: string[] = [];

  for (const pfad of [...new Set(pfade)]) {
    const eintrag = speicher.get(`${fensterEnde}|voll|${pfad}`);
    if (eintrag) {
      const url = await eintrag.url;
      if (url) karte.set(pfad, url);
      else fehlend.push(pfad);
    } else {
      fehlend.push(pfad);
    }
  }
  if (fehlend.length === 0) return karte;

  const service = supabaseService();
  if (!service) return karte;
  const { data, error } = await service.storage
    .from(UNTERLAGEN_BUCKET)
    .createSignedUrls(fehlend, expiresIn);
  if (error) {
    /* wirkung: gewollt sichtbar stattdessen: Die betroffenen Bilder fehlen sichtbar in der Galerie, die Seite selbst bleibt bedienbar; das Problem steht im Log. */
    console.error("[bild-adressen] Buendel-Signatur fehlgeschlagen:", error);
    return karte;
  }
  for (const eintrag of data ?? []) {
    if (!eintrag.path || !eintrag.signedUrl || eintrag.error) continue;
    karte.set(eintrag.path, eintrag.signedUrl);
    speicher.set(`${fensterEnde}|voll|${eintrag.path}`, {
      gueltigBisMs: fensterEnde * 1000,
      url: Promise.resolve(eintrag.signedUrl),
    });
  }
  return karte;
}

/** EINE volle Adresse, ueber denselben Speicher */
export function volleAdresse(pfad: string): Promise<string | null> {
  aufraeumen();
  const { fensterEnde } = fenster();
  const schluessel = `${fensterEnde}|voll|${pfad}`;
  const vorhanden = speicher.get(schluessel);
  if (vorhanden) return vorhanden.url;
  const url = einzelnSignieren(pfad, null);
  speicher.set(schluessel, { gueltigBisMs: fensterEnde * 1000, url });
  return url;
}
