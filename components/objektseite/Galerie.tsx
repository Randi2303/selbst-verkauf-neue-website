"use client";

import { Images } from "lucide-react";
import { useEffect, useState } from "react";
import BildAnsicht from "@/components/foto/BildAnsicht";
import { aufVolleDateiZurueckfallen } from "@/components/foto/bild-rueckfall";
import type { GalerieQuellen } from "@/components/objektseite/ObjektseiteInhalt";

/**
 * Das Titelbild im Kopf der Objektseite.
 *
 * NUR DAS TITELBILD, in jeder Breite. Hier stand zuerst ein Raster
 * nach Portal-Art, ein grosses Feld links und kleine rechts. Beim
 * Ansehen am 13.08.2026 entschieden: Die kleinen Bilder gehoeren in
 * die geoeffnete Ansicht, nicht in die Seite. Der Kopf zeigt EIN
 * Bild, gross und unbeschnitten im Verhaeltnis 3/2, und wer mehr
 * sehen will, tippt darauf.
 *
 * DAMIT GIBT ES AUCH KEINE ANZAHL-SONDERFAELLE MEHR. Das Raster
 * brauchte je Fotoanzahl einen eigenen Aufbau, und der Fall "drei"
 * war falsch: Die beiden rechten Felder standen nebeneinander statt
 * uebereinander und liessen darunter eine leere Flaeche stehen. Ein
 * Aufbau, den es nicht gibt, kann nicht schieflaufen.
 *
 * ES BLEIBT BEI EINEM ZUSCHNITT auf dieser Seite, 3/2. Die
 * quadratischen Felder der Leiste in der vollen Ansicht sind der
 * zweite; beide stehen in WASSERZEICHEN (lib/unterlagen.ts), damit
 * die Wortmarke im Bild in keinem davon angeschnitten wird.
 *
 * SEIT DER LADEZEITEN-RUNDE (18.08.2026) kommen die Bilder in
 * Anzeige-Groessen aus lib/bild-adressen.ts: der Kopf als 1600er, die
 * geoeffnete Ansicht als 2000er, die Leiste als 320er. Die vollen
 * Dateien bleiben der Rueckfall an jedem Element, denn die Umrechnung
 * ist ein eigener Endpunkt und darf beim Ausfall nicht alle Bilder
 * mitnehmen.
 */
export default function Galerie({
  quellen,
  bezeichnung,
}: {
  quellen: GalerieQuellen;
  bezeichnung: string;
}) {
  const [offen, setOffen] = useState<number | null>(null);
  const [klein, setKlein] = useState<(string | null)[]>([]);
  const [ansichten, setAnsichten] = useState<(string | null)[]>([]);

  /* Die ungeloesten Versprechen aus den Quellen loesen sich hier,
     waehrend die Seite laengst steht. Wer frueher oeffnet, bekommt
     die vollen Dateien, langsamer, aber nichts ist kaputt. */
  useEffect(() => {
    let gilt = true;
    quellen.miniUrls.then((k) => {
      if (gilt) setKlein(k);
    });
    quellen.ansichtUrls.then((a) => {
      if (gilt) setAnsichten(a);
    });
    return () => {
      gilt = false;
    };
  }, [quellen]);

  const bilder = quellen.bilder;
  if (bilder.length === 0) return null;

  const anzahl = bilder.length;
  const titel = quellen.titelUrl ?? bilder[0].voll;

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(0)}
        aria-label={anzahl === 1 ? "Foto groß anzeigen" : `Alle ${anzahl} Fotos anzeigen`}
        className="group relative block w-full overflow-hidden rounded-2xl border border-line/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={titel}
          alt={bilder[0].name || `Titelfoto: ${bezeichnung}`}
          loading="eager"
          fetchPriority="high"
          onError={(e) => aufVolleDateiZurueckfallen(e, bilder[0].voll)}
          /* HOEHE GEDECKELT (Beanstandung des Inhabers, 20.08.2026:
             "Das Foto ist sehr gross"). Das Seitenverhaeltnis 3/2
             allein rechnet die Hoehe aus der Breite; auf einem Laptop
             mit 1440x900 ergab das ein Bild von 1102x735 Pixeln, also
             82 Prozent der Bildschirmhoehe. Der Preis stand damit 243
             Pixel unterhalb des ersten Bildschirms, und ein
             Interessent sah zuerst ein Foto und sonst nichts.

             DIE 440 IST GEMESSEN, nicht geschaetzt: 318 Pixel stehen
             ueber dem Bild (Markenzeile, Sprungleiste, Ueberschrift
             mit Adresse), rund 91 folgen darunter bis zur Preiszeile
             der Karte "Auf einen Blick", dazu etwas Luft. Was uebrig
             bleibt, darf das Bild hoch sein; dann steht der Preis auf
             dem ersten Bildschirm.

             WARUM NICHT EINFACH EIN ANTEIL DER HOEHE: Mit 52vh stand
             der Preis bei 1440x900 zwar knapp im Bild, bei 1440x800
             und 1280x800 aber wieder 25 Pixel darunter. Der Vorlauf
             ueber dem Bild ist eben fest und schrumpft nicht mit dem
             Fenster, also muss er abgezogen und nicht anteilig
             geschaetzt werden.

             Die Untergrenze von 220 Pixeln faengt sehr flache
             Fenster ab: Lieber ein Preis unter der Kante als ein Bild,
             von dem nichts mehr zu erkennen ist.

             Auf dem Telefon aendert sich nichts: Dort ist das Bild
             aus der Breite ohnehin nur 237 Pixel hoch, das Verhaeltnis
             3/2 bleibt also die engere Grenze. */
          className="aspect-[3/2] max-h-[max(220px,calc(100vh-440px))] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.01] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {anzahl > 1 ? (
          /* FESTE FARBEN, keine Marken aus dem Farbschema: bg-ink ist
             im Dunkelmodus HELL, und eine helle Pille verschwindet auf
             hellem Himmel. Diese Seite kennt heute keinen Dunkelmodus,
             aber ein Foto folgt ohnehin keinem Farbschema.

             UNTEN LINKS, nicht rechts: Das eingebrannte Wasserzeichen
             sitzt in der unteren rechten Ecke des sicheren Bereichs.
             Rechts haette die Pille es verdeckt, und ein halb
             verdecktes Wasserzeichen sieht nach Fehler aus. */
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#101214]/70 px-3 py-1.5 text-[0.82rem] font-medium text-[#EDE9E3] backdrop-blur-sm">
            <Images size={14} strokeWidth={1.9} />
            Alle {anzahl} Fotos
          </span>
        ) : null}
      </button>

      {offen !== null ? (
        <BildAnsicht
          bilder={bilder.map((b, i) => ({
            id: `${i}`,
            url: ansichten[i] ?? b.voll,
            voll: b.voll,
            name: b.name,
            mini: klein[i] ?? undefined,
          }))}
          index={offen}
          aufIndex={setOffen}
          aufSchliessen={() => setOffen(null)}
        />
      ) : null}
    </>
  );
}
