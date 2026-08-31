/**
 * Der Name einer Datei, an EINER Stelle.
 *
 * WARUM ES DIESE DATEI GIBT: Seit dem 14.08.2026 geht der Name, den
 * der Kunde beim Hochladen mitbringt, mit zu den Portalen. Damit ist
 * er keine technische Nebensache mehr, sondern Text, den Fremde lesen.
 * Und Text, den Fremde lesen, braucht eine Stelle, an der die Regeln
 * stehen, statt fuenf Stellen, die es aehnlich machen.
 *
 * DREI VERSCHIEDENE DINGE, bewusst getrennt:
 *   anzeigeName    was der Mensch sieht, ohne Endung
 *   portalTitel    was als Beschriftung zum Portal geht, gekuerzt
 *   exportDatei    wie die Datei im Paket heisst, technisch sicher
 */

/** Ab hier kuerzt ImmoScout24 die Bildbeschriftung, siehe unten */
export const PORTAL_TITEL_MAX = 30;

/**
 * Unsere eigene Obergrenze fuer die Eingabe. Grosszuegiger als die
 * Portal-Grenze mit Absicht: Wer "Wohnzimmer mit Blick in den Garten"
 * schreiben will, soll das duerfen; gekuerzt wird erst beim Portal,
 * und das sagen wir ihm dort, wo er tippt.
 */
export const NAME_MAX = 60;

/**
 * Zeichen, die in keinem Namen etwas zu suchen haben.
 *
 * Schraegstriche wuerden im Export als Pfadtrenner gelesen,
 * Steuerzeichen zerlegen jede XML-Datei. Alles andere bleibt, auch
 * Umlaute: Der Standard traegt UTF-8, und "Küche" ist der richtige
 * Name fuer eine Kueche.
 */
const VERBOTEN = /[\u0000-\u001f\u007f/\\]/g;

/** Bekannte Endungen, die wir beim Anzeigen abschneiden */
const ENDUNGEN = /\.(jpe?g|png|heic|heif|webp|gif|tiff?|pdf)$/i;

/**
 * Der Name ohne Endung, fuer JEDE Anzeige.
 *
 * Ein Kunde, der seine Fotos benennt, denkt nicht in Dateiendungen.
 * "Wohnzimmer.jpg" ist die Datei, "Wohnzimmer" ist das Bild. Die Datei
 * behaelt ihre Endung natuerlich, sonst liesse sie sich nicht oeffnen;
 * es geht allein um den Text, der angezeigt wird.
 */
export function anzeigeName(dateiName: string | null | undefined): string {
  return (dateiName ?? "").replace(ENDUNGEN, "").trim();
}

/** Die Endung mit Punkt, oder leer. Gegenstueck zu anzeigeName. */
export function endungVon(dateiName: string | null | undefined): string {
  const treffer = (dateiName ?? "").match(ENDUNGEN);
  return treffer ? treffer[0] : "";
}

/**
 * Was beim Speichern aus der Eingabe wird.
 *
 * NICHT STILL AENDERN, sondern das Ergebnis sofort zurueckgeben: Die
 * Oberflaeche zeigt danach genau den Namen an, der gespeichert wurde.
 * Wer sieht, was ankam, muss nicht raten, ob etwas passiert ist.
 *
 * Gibt null zurueck, wenn nichts Brauchbares uebrig bleibt; der
 * Aufrufer behaelt dann den alten Namen. Ein leerer Name waere im
 * Portal eine leere Beschriftung, und das ist schlechter als jeder
 * schlechte Name.
 */
export function nameBereinigen(eingabe: string): string | null {
  const sauber = eingabe
    .replace(VERBOTEN, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, NAME_MAX)
    .trim();
  return sauber.length > 0 ? sauber : null;
}

/**
 * Der neue Dateiname aus dem eingegebenen Anzeigenamen: bereinigter
 * Name plus die ALTE Endung. Die Endung tippt niemand mit, und wer sie
 * doch mittippt, soll nicht "Wohnzimmer.jpg.jpg" bekommen.
 */
export function neuerDateiName(eingabe: string, alterName: string): string | null {
  const sauber = nameBereinigen(anzeigeName(eingabe) || eingabe);
  if (!sauber) return null;
  return `${sauber}${endungVon(alterName)}`;
}

/**
 * Die Beschriftung, die zum Portal geht.
 *
 * DIE GRENZE IST NICHT UNSERE: ImmoScout24 nimmt fuer den Titel eines
 * Anhangs hoechstens 30 Zeichen an (Feld-Limits in
 * docs/immoscout24-api.md, ausgewertet am 06.08.2026). OpenImmo selbst
 * kennt fuer anhangtitel keine Laenge, das Feld ist dort xsd:string.
 * Wir kuerzen deshalb erst hier, am Rand zum Portal, und nie in
 * unseren eigenen Daten.
 */
export function portalTitel(dateiName: string | null | undefined): string {
  const name = anzeigeName(dateiName);
  if (name.length <= PORTAL_TITEL_MAX) return name;
  return name.slice(0, PORTAL_TITEL_MAX).trimEnd();
}

/** Umlaute und scharfes S fuer Dateinamen umschreiben */
const UMSCHRIFT: Record<string, string> = {
  ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss",
};

/**
 * Wie die Datei im Portal-Paket heisst.
 *
 * WARUM NICHT EINFACH DER NAME: Die OpenImmo-Lieferung ist ein Paket
 * aus XML und Bilddateien, und dieses Paket wird auf fremden Rechnern
 * ausgepackt. Umlaute, Leerzeichen und Sonderzeichen ueberleben das
 * nicht zuverlaessig. Die laufende Nummer davor haelt zusaetzlich die
 * Reihenfolge fest und macht jeden Namen eindeutig, auch wenn zwei
 * Fotos gleich heissen.
 *
 * Die BESCHRIFTUNG bleibt davon unberuehrt, die traegt anhangtitel
 * mit Umlauten und Leerzeichen.
 */
export function exportDateiName(
  position: number,
  dateiName: string | null | undefined,
  endung?: string
): string {
  const roh = anzeigeName(dateiName) || "foto";
  const umgeschrieben = roh.replace(/[äöüÄÖÜß]/g, (z) => UMSCHRIFT[z] ?? z);
  const kern =
    umgeschrieben
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "foto";
  const nummer = String(position).padStart(3, "0");
  return `${nummer}-${kern}${(endung ?? endungVon(dateiName)).toLowerCase()}`;
}
