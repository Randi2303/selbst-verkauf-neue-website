"use client";

import { m, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useState } from "react";
import { aufVolleDateiZurueckfallen } from "@/components/foto/bild-rueckfall";
import { cn } from "@/lib/shadcn-utils";

/**
 * Das Objekt zeigen, nicht nur benennen.
 *
 * Wer über mehrere hunderttausend Euro entscheidet, will die Immobilie
 * vor Augen haben. Deshalb steht das Titelbild groß über der Kopfkarte,
 * die weiteren Fotos folgen als ruhige Galerie zum Durchblättern.
 *
 * OHNE FOTOS entsteht bewusst KEIN leerer Bildkasten. Dann übernimmt
 * eine schmale, gesetzte Fläche mit der Objektbezeichnung die Aufgabe:
 * Sie trägt die Seite typografisch und sieht nach Absicht aus, nicht
 * nach fehlendem Inhalt.
 *
 * Kein Karussell mit Automatik. Es blättert nur, wer blättern will.
 */
export default function ObjektGalerie({
  bilder,
  bezeichnung,
}: {
  /**
   * Signierte Adressen je Bild, kurz gueltig, vom Server erzeugt:
   * `gross` (1600) fuer die Buehne, `klein` (320) fuer die Leiste,
   * `voll` als Rueckfall, wenn eine Umrechnung nicht laedt
   * (lib/bild-adressen.ts). Vorher lud die Leiste zwoelf VOLLE
   * Dateien, gemessen 19,9 MB je Aufruf der Gebotsseite.
   */
  bilder: { gross: string; klein: string; voll: string }[];
  bezeichnung: string;
}) {
  const ruhig = useReducedMotion();
  const [aktiv, setAktiv] = useState(0);

  if (bilder.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface px-6 py-7 sm:px-8">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-paper text-ink-muted">
          <ImageOff size={20} strokeWidth={1.6} />
        </span>
        <p className="text-pretty text-[0.92rem] leading-relaxed text-ink-muted">
          Für dieses Objekt liegen noch keine Fotos vor. Die Eckdaten
          darunter beschreiben es, und der Eigentümer beantwortet Ihnen
          gern alles Weitere.
        </p>
      </div>
    );
  }

  const weiter = (richtung: 1 | -1) =>
    setAktiv((i) => (i + richtung + bilder.length) % bilder.length);

  const Bild = ruhig ? "img" : m.img;

  return (
    <figure className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
        {/* Feste Seitenverhältnisse, damit beim Wechseln nichts springt */}
        <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
          <Bild
            key={bilder[aktiv].gross}
            src={bilder[aktiv].gross}
            alt={`${bezeichnung}, Bild ${aktiv + 1} von ${bilder.length}`}
            onError={(e) => aufVolleDateiZurueckfallen(e, bilder[aktiv].voll)}
            className="absolute inset-0 size-full object-cover"
            {...(ruhig
              ? {}
              : {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] },
                })}
          />
        </div>

        {bilder.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => weiter(-1)}
              aria-label="Vorheriges Bild"
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft size={18} strokeWidth={1.9} />
            </button>
            <button
              type="button"
              onClick={() => weiter(1)}
              aria-label="Nächstes Bild"
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight size={18} strokeWidth={1.9} />
            </button>
          </>
        ) : null}
      </div>

      {bilder.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {bilder.map((b, i) => (
            <button
              key={b.klein}
              type="button"
              onClick={() => setAktiv(i)}
              aria-label={`Bild ${i + 1} anzeigen`}
              aria-current={i === aktiv}
              className={cn(
                "size-14 overflow-hidden rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-16",
                i === aktiv ? "border-primary" : "border-line/70 hover:border-primary/40"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.klein}
                alt=""
                onError={(e) => aufVolleDateiZurueckfallen(e, b.voll)}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <figcaption className="sr-only">{bezeichnung}</figcaption>
    </figure>
  );
}
