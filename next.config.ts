import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Der Passwortschutz-Schalter wird zur Build-Zeit auch ins
   * Client-Bundle übernommen (kein Geheimnis, nur "true"/"false"),
   * damit die Navigation ihr Prefetching daran ausrichten kann
   * (siehe lib/passwortschutz.ts).
   */
  env: {
    PASSWORD_PROTECT: process.env.PASSWORD_PROTECT ?? "",
  },
  /*
   * DIE GRENZE FUER HOCHGELADENE DATEIEN.
   *
   * WARUM ES SIE GEBEN MUSS: Sobald ein Proxy vor den Routen liegt,
   * und bei uns liegt einer (proxy.ts, der Vorlaunch-Passwortschutz),
   * schneidet Next den Rumpf einer Anfrage bei 10 MB ab. Der Rest
   * kommt nicht an, formData() findet ein halbes Multipart-Paket und
   * wirft. Das ist am 13.08.2026 aufgefallen: Drei PNG-Dateien
   * zwischen 10 und 15 MB scheiterten alle, und weil der Fehler VOR
   * unserem Code passierte, kam beim Kunden nur "Upload
   * fehlgeschlagen" an.
   *
   * DER WERT MUSS UEBER DER GROESSTEN DATEI-GRENZE DES HAUSES LIEGEN,
   * und zwar mit Luft: Multipart verpackt die Datei mit Trennzeilen und
   * Kopfzeilen, der Rumpf ist also groesser als die Datei.
   *
   * ES SIND ZWEI GRENZEN, NICHT EINE (Befund vom 22.08.2026):
   *
   *   MAX_DATEI_MB       15  lib/unterlagen.ts, was der Kunde hochlaedt
   *   MAX_ERGEBNIS_MB    50  app/api/admin/auftraege/[id]/route.ts,
   *                          was das Team als Ergebnis ablegt
   *
   * Der Wert stand auf 20mb und richtete sich allein nach der ersten.
   * Die zweite ist seit Migration 0045 groesser, weil dort auch Video
   * erlaubt ist. Jede Ergebnis-Datei ueber rund 20 MB scheiterte damit
   * VOR unserem Kode, ohne dass jemand eine verstaendliche Meldung
   * bekam; das Kamerateam haette das erste Objektvideo nie ablegen
   * koennen. 60mb deckt die 50 MB samt Multipart-Verpackung.
   *
   * NICHT HOEHER OHNE NOT: Die Route liest die Datei mit
   * `Buffer.from(await datei.arrayBuffer())` vollstaendig in den
   * Speicher. 50 MB je Anfrage traegt der Prozess, 500 MB nicht.
   *
   * DIE EIGENTLICHE GRENZE BLEIBT DIE JEWEILIGE MAX_..._MB. Diese hier
   * ist nur die Schwelle, ab der die Anfrage gar nicht erst ankommt;
   * sie darf nie die sein, die jemand spuert, denn sie kann ihm
   * niemand erklaeren.
   */
  experimental: {
    proxyClientMaxBodySize: "60mb",
  },
  images: {
    // Unsplash-Platzhalterfotos, werden später durch eigene Fotos ersetzt
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  /*
   * Kein Suchindex fuer persoenliche und geteilte Seiten, TECHNISCH
   * durchgesetzt statt nur als Meta-Bitte: X-Robots-Tag gilt auch fuer
   * die PDF-Antworten und alles, was die Seiten nachladen.
   */
  async headers() {
    /*
     * LANGE HALTBARKEIT FUER VERSIONIERTE BILDER (Inhaber, Runde 31,
     * 26.08.2026). Befund: Ohne diese Kopfzeile liefert public/ nur
     * max-age=0, die echte Domain hinter dem Hostinger-CDN sogar ganz
     * ohne Cache-Control; Browser raten die Haltbarkeit dann aus dem
     * Dateialter, und ein Besucher kann nach einem Bild-Tausch die
     * alte Fassung sehen (in Safari live passiert, Unterschrift).
     *
     * DIE KOPFZEILE IST NUR ZUSAMMEN MIT DER NAMENSREGEL RICHTIG:
     * Geaenderter Bildinhalt bekommt IMMER einen neuen Dateinamen,
     * nie denselben. So arbeitet Runde 31 durchgaengig (mockups,
     * unterschriften, team, makler). Wer unter gleichem Namen
     * ueberschreibt, brennt mit "immutable" die alte Fassung bis zu
     * einem Jahr in Browser und CDN fest.
     *
     * NACH JEDEM AUSROLLEN gegen die echte Domain nachmessen, ob das
     * CDN die Kopfzeile durchreicht:
     *   curl -sI https://selbst-verkauf.de/images/makler/hansjoerg-niermann.webp | grep -i cache-control
     * Erwartet: public, max-age=31536000, immutable. Fehlt sie, haelt
     * das Hostinger-CDN sie zurueck (hPanel der Website, Bereich
     * Leistung, Unterpunkt CDN); dort auch der Knopf zum Leeren des
     * CDN-Speichers nach dem Ausrollen.
     */
    const einJahrUnveraenderlich = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];
    return [
      {
        source: "/o/:pfad*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/expose/:pfad*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      { source: "/images/mockups/:datei*", headers: einJahrUnveraenderlich },
      { source: "/images/unterschriften/:datei*", headers: einJahrUnveraenderlich },
      { source: "/images/team/:datei*", headers: einJahrUnveraenderlich },
      { source: "/images/makler/:datei*", headers: einJahrUnveraenderlich },
    ];
  },
};

export default nextConfig;
