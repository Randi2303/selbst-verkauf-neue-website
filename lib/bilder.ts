/**
 * Server-Bildverarbeitung für den Unterlagen-Bereich (NUR SERVER-SEITIG,
 * sharp und heic-convert sind native Module).
 *
 * Aufgaben: HEIC zu JPG wandeln (damit Vorschau und Exposé überall
 * funktionieren), Bildmaße lesen, die dezente Wasserzeichen-Kopie für
 * Export-Versionen erzeugen und die Mock-Verbesserung der Foto-KI.
 */
import { join } from "node:path";
import sharp from "sharp";
import heicConvert from "heic-convert";
import { WASSERZEICHEN } from "@/lib/unterlagen";

/** Die einmal gerenderte Wortmarke, siehe assets/wasserzeichen.png */
const WORTMARKE_PFAD = join(process.cwd(), "assets", "wasserzeichen.png");

/**
 * Fotos werden beim Upload auf diese lange Kante gebracht (JPG in
 * guter Qualität). Handyfotos mit 5 bis 10 MB schrumpfen so auf rund
 * ein Megabyte, für Portale, Exposé und Bildschirm mehr als genug.
 * Kleinere Bilder werden NIE künstlich vergrößert, und die Prüfung
 * "Für Portale zu klein" arbeitet mit den Maßen VOR der Optimierung.
 */
export const FOTO_MAX_KANTE = 2560;
export const FOTO_JPG_QUALITAET = 82;

/**
 * Guete der Wasserzeichen-Kopie einer KI-VERBESSERTEN Fassung. Deren
 * Quelle ist die bezahlte 90er-Datei des Anbieters (volleFassungHolen
 * in lib/autoenhance.ts); die Kopie bleibt mit 88 knapp darunter, denn
 * hoeher als die Quelle zu kodieren fuegt nichts hinzu. Eigene Uploads
 * nehmen ihre eigene Quell-Guete (FOTO_JPG_QUALITAET).
 */
export const WZ_QUALITAET_VERBESSERT = 88;

export type VerarbeiteteDatei = {
  buffer: Buffer;
  mime: string;
  endung: string;
  breite: number | null;
  hoehe: number | null;
};

/**
 * Upload vorbereiten: HEIC wird zu JPG gewandelt, die EXIF-Drehung
 * fest eingebrannt und das Bild auf die Maximalgröße optimiert.
 * Gespeichert wird die optimierte Fassung als "Original" im Sinne des
 * Kontos, die gemeldeten Maße sind die der HOCHGELADENEN Datei, damit
 * die Qualitäts-Hinweise die echte Ausgangs-Auflösung bewerten.
 * PDFs laufen unverändert durch.
 */
export async function verarbeiteUpload(
  eingabe: Buffer,
  mime: string
): Promise<VerarbeiteteDatei> {
  if (mime === "application/pdf") {
    return { buffer: eingabe, mime, endung: "pdf", breite: null, hoehe: null };
  }

  let bildBuffer = eingabe;
  if (mime === "image/heic" || mime === "image/heif") {
    const gewandelt = await heicConvert({
      buffer: eingabe,
      format: "JPEG",
      quality: 0.9,
    });
    bildBuffer = Buffer.from(gewandelt);
  }

  // Drehung aus EXIF fest einbrennen, damit alle Folge-Schritte
  // (Wasserzeichen, Exposé) die richtige Ausrichtung sehen, dann die
  // Maße der Ausgangsdatei festhalten
  const ausgerichtet = await sharp(bildBuffer).rotate().toBuffer();
  const original = await sharp(ausgerichtet).metadata();

  // Speicher sparsam: lange Kante begrenzen, ohne kleine Bilder zu
  // vergrößern. Fotos (JPG, HEIC) werden als JPG in guter Qualität
  // abgelegt, PNG bleibt PNG, damit Grundriss-Linien scharf bleiben
  const verkleinert = sharp(ausgerichtet).resize({
    width: FOTO_MAX_KANTE,
    height: FOTO_MAX_KANTE,
    fit: "inside",
    withoutEnlargement: true,
  });
  const istPng = mime === "image/png";
  const optimiert = await (istPng
    ? verkleinert.png({ compressionLevel: 9 })
    : verkleinert.jpeg({ quality: FOTO_JPG_QUALITAET, mozjpeg: true })
  ).toBuffer();

  return {
    buffer: optimiert,
    mime: istPng ? "image/png" : "image/jpeg",
    endung: istPng ? "png" : "jpg",
    breite: original.width ?? null,
    hoehe: original.height ?? null,
  };
}

/**
 * Die Export-Kopie mit dezentem Wasserzeichen: Wortmarke klein in der
 * unteren rechten Ecke, halbtransparent, Größe relativ zur Bildbreite.
 * Das Original bleibt unangetastet, diese Funktion liefert eine KOPIE.
 * Konstanten zentral in lib/unterlagen.ts (WASSERZEICHEN).
 *
 * DIE GUETE NENNT DER AUFRUFER, und zwar die seiner QUELLE (18.08.2026):
 * Eine Kopie hoeher zu kodieren als ihre Vorlage fuegt keine Information
 * hinzu, sie kostet nur Platz und Ladezeit. Hier stand fest 88, aus der
 * Zeit, als die Kopie noch vom unkomprimierten Upload abgeleitet wurde;
 * seit der Upload selbst mit 82 gespeichert wird (3baf1f5), war die
 * Marke rund ein Drittel GROESSER als ihr Original, gemessen an zwanzig
 * Fotos: 34,5 MB Kopien zu 27,0 MB Originalen.
 */
export async function erzeugeWasserzeichenKopie(
  bild: Buffer,
  qualitaet: number
): Promise<Buffer> {
  const basis = sharp(bild);
  const meta = await basis.metadata();
  const breite = meta.width ?? 1600;
  const hoehe = meta.height ?? 1200;

  const wzBreite = Math.max(120, Math.round(breite * WASSERZEICHEN.breitenAnteil));
  /* Die Masse der Marke brauchen wir VOR ihrem Aussehen, denn erst
     ihre Lage sagt, welcher Bildausschnitt darunter liegt.

     ERST IN EINEN PUFFER, DANN MESSEN: metadata() auf einer Pipeline
     liefert die Masse der QUELLE, nicht die des verkleinerten Bildes.
     Mit den 1200 px der Quelldatei statt der gerechneten 162 landete
     die Marke am 14.08.2026 weit links ausserhalb ihres Platzes. */
  const wzMeta = await sharp(
    await sharp(WORTMARKE_PFAD).resize({ width: wzBreite }).png().toBuffer()
  ).metadata();
  const rand = Math.round(breite * WASSERZEICHEN.randAnteil);

  /* ----------------------------------------------------------------
     DER SICHERE BEREICH.
     ----------------------------------------------------------------
     Die Anzeige schneidet mit object-cover zu, und zwar MITTIG. Ein
     Zuschnitt auf ein breiteres Format nimmt oben und unten weg, einer
     auf ein schmaleres links und rechts. Sichtbar bleibt in jedem Fall
     der mittige Kasten, der beide Zuschnitte uebersteht:

        Breite  = min(Bildbreite, Bildhoehe * schmalstes Verhaeltnis)
        Hoehe   = min(Bildhoehe,  Bildbreite / breitestes Verhaeltnis)

     Die Wortmarke sitzt in dessen unterer rechter Ecke statt in der
     des Vollbilds. Auf dem ungeschnittenen Bild rueckt sie damit ein
     Stueck nach innen; das ist der Preis dafuer, dass sie in JEDEM
     Zuschnitt vollstaendig dasteht, und er ist es wert.

     Das Expose-PDF macht es seit jeher anders und ebenso richtig: Dort
     ist der Zuschnitt bekannt, deshalb kommt das Wasserzeichen erst
     NACH dem Zuschnitt darauf (bildAufbereiten in lib/expose.ts). Hier
     ist er unbekannt, also muss die Ecke wandern. */
  const sicherBreite = Math.min(breite, hoehe * WASSERZEICHEN.anzeigeSchmal);
  const sicherHoehe = Math.min(hoehe, breite / WASSERZEICHEN.anzeigeBreit);
  const rechts = Math.round((breite + sicherBreite) / 2);
  const unten = Math.round((hoehe + sicherHoehe) / 2);

  /* Math.max gegen negative Werte: Bei einem sehr kleinen Bild waere
     die Wortmarke sonst breiter als der sichere Bereich, und sharp
     bricht bei einem Versatz ausserhalb des Bildes ab. */
  const links = Math.max(0, rechts - (wzMeta.width ?? wzBreite) - rand);
  const oben = Math.max(0, unten - (wzMeta.height ?? 0) - rand);

  /* ----------------------------------------------------------------
     DIE MARKE PASST SICH DEM UNTERGRUND AN (Fassung D, 14.08.2026).
     ----------------------------------------------------------------
     Vorher war sie hell und lag bei 55 Prozent Deckkraft. Auf einem
     hellen Himmel und erst recht auf einer weissen Hauswand konnte sie
     damit nicht lesbar sein; auf einem dunklen Dach stand sie. Eine
     Marke, die auf der Haelfte aller Fotos verschwindet, schuetzt
     nichts und kennzeichnet nichts.

     Deshalb wird jetzt gemessen: Der Ausschnitt, der spaeter unter der
     Marke liegt, gibt seine mittlere Helligkeit her, und danach faellt
     die Entscheidung zwischen dunkler und heller Schrift. Dazu ein
     weicher Schatten in der Gegenfarbe, der auch dann traegt, wenn der
     Untergrund gemustert ist und die mittlere Helligkeit wenig sagt.

     EINFARBIG, nicht zweifarbig: Das Terrakotta im ".de" hat bei
     dieser Groesse und Deckkraft kaum Kontrast, die Marke zerfiel
     sichtbar in zwei ungleich starke Haelften. Am Vergleich der vier
     Fassungen entschieden. */
  const ausschnitt = await sharp(bild)
    .extract({
      left: links,
      top: oben,
      width: Math.min(wzMeta.width ?? wzBreite, breite - links),
      height: Math.min(wzMeta.height ?? 1, hoehe - oben),
    })
    .stats();
  const [r, g, b] = ausschnitt.channels;
  const helligkeit = (0.2126 * r.mean + 0.7152 * g.mean + 0.0722 * b.mean) / 255;
  const aufHell = helligkeit > WASSERZEICHEN.helligkeitsGrenze;
  const schrift = aufHell ? [16, 18, 20] : [255, 255, 255];
  const schattenFarbe = aufHell ? [255, 255, 255] : [0, 0, 0];

  const einfaerben = async (farbe: number[], deckkraft: number) =>
    sharp(
      await sharp(WORTMARKE_PFAD)
        .resize({ width: wzBreite })
        .composite([
          {
            input: Buffer.from([...farbe, 255]),
            raw: { width: 1, height: 1, channels: 4 },
            tile: true,
            blend: "in",
          },
        ])
        .png()
        .toBuffer()
    )
      .composite([
        {
          input: Buffer.from([255, 255, 255, Math.round(255 * deckkraft)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();

  const wortmarke = await einfaerben(schrift, WASSERZEICHEN.deckkraft);
  const schatten = await sharp(
    await einfaerben(schattenFarbe, WASSERZEICHEN.schattenDeckkraft)
  )
    .blur(WASSERZEICHEN.schattenWeichheit)
    .png()
    .toBuffer();

  return (
    basis
      .composite([
        /* Der Schatten liegt zuerst und einen Hauch tiefer. Er ist die
           Versicherung gegen gemusterte Untergruende, bei denen die
           mittlere Helligkeit die falsche Antwort gibt. */
        { input: schatten, left: links, top: oben + 2, blend: "over" },
        { input: wortmarke, left: links, top: oben, blend: "over" },
      ])
      /* METADATEN UEBERLEBEN DIE MARKE (17.08.2026): sharp wirft EXIF,
         IPTC und XMP beim Neu-Kodieren standardmaessig weg. Bei den
         eigenen Uploads war das egal (verarbeiteUpload hat sie laengst
         entfernt), bei KI-verbesserten Bildern nicht: Dort steckt die
         maschinenlesbare Kennzeichnung "AI Modified" nach Artikel 50
         der KI-Verordnung, und eine Wasserzeichen-Kopie ohne sie waere
         ein KI-Bild ohne Kennzeichnung Richtung Portal. Gemessen in
         scripts/foto-ki-metadaten-messen.mjs. Die C2PA-Signatur
         (JPEG-APP11) uebersteht KEIN Neu-Kodieren, das liegt am
         Standard selbst; sie bleibt in der unveraenderten verbesserten
         Fassung erhalten. */
      .keepMetadata()
      .jpeg({ quality: qualitaet, mozjpeg: true })
      .toBuffer()
  );
}

/**
 * Mock der Foto-Verbesserung: Belichtung, Sättigung und Schärfe
 * sichtbar angehoben, damit der Ablauf ohne Anbieter-Schluessel
 * komplett testbar ist (FOTO_KI_MOCK=true, siehe fotoKiModus in
 * lib/autoenhance.ts). Er laeuft durch DIESELBE Zustandsmaschine wie
 * die echte Anbindung (lib/foto-ki-ablauf.ts).
 */
export async function mockVerbesserung(bild: Buffer): Promise<Buffer> {
  return sharp(bild)
    .rotate()
    .modulate({ brightness: 1.1, saturation: 1.18 })
    .linear(1.08, -8)
    .sharpen({ sigma: 1.2 })
    .jpeg({ quality: 90 })
    .toBuffer();
}
