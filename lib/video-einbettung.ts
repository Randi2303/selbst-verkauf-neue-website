/**
 * DER VERWEIS AUF EIN VIDEO, EINGEBETTET ODER NICHT.
 *
 * ---------------------------------------------------------------------
 * WARUM WIR VIDEOS VERWEISEN UND NICHT SELBST AUSLIEFERN (Runde 20)
 * ---------------------------------------------------------------------
 * Ein Objektvideo von 90 Sekunden wiegt in 1080p rund 90 bis 180 MB.
 * Der Speicher wäre bezahlbar, die Übertragung ist es nicht: Dieselbe
 * Datei, 500-mal angesehen, sind 75 GB für EIN Objekt, und ohne
 * Streaming lädt jedes Handy sie vollständig. Dazu kommt, dass wir
 * nichts umwandeln können: Die Umrechnung von Supabase
 * (lib/bild-adressen.ts) und die Foto-KI sind Bild-Werkzeuge, und
 * HEVC oder ProRes spielt kein Browser ab.
 *
 * Der OpenImmo-Standard sieht beides vor, `FILM` als beiliegende Datei
 * und `FILMLINK` als Verweis. Die Portale gehen den Verweis, und wir
 * gehen ihn mit.
 *
 * ---------------------------------------------------------------------
 * WAS DIESE DATEI TUT, UND WAS NICHT
 * ---------------------------------------------------------------------
 * Sie macht aus der Adresse, die ein Mensch hineinschreibt, eine
 * EINBETT-Adresse, wenn sie einen Anbieter erkennt, den wir kennen.
 * Erkennt sie keinen, liefert sie null, und die Objektseite zeigt dann
 * einen Knopf, der in einem neuen Fenster öffnet.
 *
 * NULL IST HIER KEIN FEHLER, sondern der ehrliche Rückfall. Eine
 * geratene Einbett-Adresse ergäbe ein leeres schwarzes Rechteck auf
 * der Objektseite eines Kunden, und das ist schlechter als ein Link.
 *
 * YOUTUBE OHNE COOKIES: youtube-nocookie.com setzt beim Laden keine
 * Werbe-Kennungen. Der Zwei-Klick-Weg der Objektseite gilt trotzdem
 * weiter; erst nach dem Klick wird überhaupt etwas geladen.
 */

/**
 * Kennung eines YouTube-Videos: elf Zeichen aus Buchstaben, Ziffern,
 * Strich und Unterstrich. Das ist das dokumentierte Format.
 */
const YT_KENNUNG = /^[\w-]{11}$/;

/** Kennung eines Vimeo-Videos: nur Ziffern */
const VIMEO_KENNUNG = /^\d+$/;

/**
 * Die Einbett-Adresse zu einem Video-Verweis, oder null, wenn wir den
 * Anbieter nicht kennen.
 *
 * WIRFT NIE: Eine kaputte Adresse ist kein Grund, eine Objektseite
 * umzuwerfen. Sie führt zum Rückfall auf den Knopf.
 */
export function einbettAdresse(link: string): string | null {
  let adresse: URL;
  try {
    adresse = new URL(link);
  } catch {
    /* wirkung: gewollt sichtbar stattdessen: Eine Zeichenkette, die
       keine Adresse ist, ist kein Fehler dieser Funktion, sondern eine
       Eingabe, die keine Einbettung zulaesst. Der Rueckfall ist
       sichtbar (die Objektseite zeigt statt eines Rahmens den Knopf
       "in neuem Fenster oeffnen"), und die Fertig-Meldung des Auftrags
       hat die Adresse vorher ohnehin auf http/https geprueft. */
    return null;
  }
  /* NUR HTTPS. Ein http-Rahmen in einer https-Seite wird vom Browser
     ohnehin blockiert, und das Ergebnis wäre wieder das leere
     schwarze Rechteck. */
  if (adresse.protocol !== "https:") return null;

  const wirt = adresse.hostname.replace(/^www\./, "");

  if (wirt === "youtu.be") {
    const kennung = adresse.pathname.slice(1);
    return YT_KENNUNG.test(kennung)
      ? `https://www.youtube-nocookie.com/embed/${kennung}`
      : null;
  }
  if (wirt === "youtube.com" || wirt === "youtube-nocookie.com" || wirt === "m.youtube.com") {
    const ausParameter = adresse.searchParams.get("v");
    if (ausParameter && YT_KENNUNG.test(ausParameter)) {
      return `https://www.youtube-nocookie.com/embed/${ausParameter}`;
    }
    /* /embed/ID und /shorts/ID tragen die Kennung im Pfad */
    const ausPfad = adresse.pathname.replace(/^\/(embed|shorts|v)\//, "");
    return YT_KENNUNG.test(ausPfad)
      ? `https://www.youtube-nocookie.com/embed/${ausPfad}`
      : null;
  }
  if (wirt === "vimeo.com") {
    /* vimeo.com/123456789 und vimeo.com/123456789/abcdef (nicht
       gelistete Videos tragen einen zweiten Teil) */
    const teile = adresse.pathname.split("/").filter(Boolean);
    const kennung = teile[0] ?? "";
    if (!VIMEO_KENNUNG.test(kennung)) return null;
    const geheim = teile[1];
    return geheim
      ? `https://player.vimeo.com/video/${kennung}?h=${encodeURIComponent(geheim)}`
      : `https://player.vimeo.com/video/${kennung}`;
  }
  if (wirt === "player.vimeo.com") return adresse.toString();

  return null;
}
