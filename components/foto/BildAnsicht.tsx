"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { aufVolleDateiZurueckfallen } from "@/components/foto/bild-rueckfall";
import { useBildAnsichtVerhalten } from "@/lib/bild-ansicht-verhalten";

/**
 * Die eine grosse Bildansicht: dunkler Grund, das Bild gross in der
 * Mitte, die Zaehlung oben links, das Schliessen oben rechts, die
 * Pfeile weit aussen am Fensterrand und darunter eine ruhige Zeile mit
 * der Beschriftung. Wischen auf dem Handy, Pfeiltasten am Rechner,
 * Schliessen ueber Kreuz, Klick daneben und Escape.
 *
 * EINMAL GEBAUT, UEBERALL VERWENDBAR: Objektmaske und oeffentliche
 * Objektseite nutzen sie heute; Gebotsseite und weitere koennen
 * dieselbe Ansicht bekommen. Die Galerie im Foto-Bereich behaelt ihre
 * eigene Arbeits-Lightbox, weil dort Werkzeuge (Verbessern, Expose,
 * Loeschen) integriert sind; das gemeinsame VERHALTEN liegt trotzdem
 * an einer Stelle, siehe lib/bild-ansicht-verhalten.
 *
 * DIE PFEILE HAENGEN AM FENSTER, nicht am Bild. Vorher standen sie in
 * derselben Reihe wie das Bild und rueckten mit jedem Hochformat nach
 * innen; wer blaettert, sucht sie dann bei jedem Foto woanders. Am
 * Rand stehen sie immer gleich, und das Bild darf so breit werden, wie
 * es mag.
 */

export type AnsichtBild = {
  id: string;
  url: string;
  /**
   * Die Beschriftung, also der Name des Fotos ohne Endung. Sie steht
   * unter dem Bild und ist derselbe Text, der spaeter beim Portal als
   * Bildbeschriftung erscheint.
   */
  name?: string;
  /**
   * Die kleine Fassung fuer die Leiste. Fehlt sie, nimmt die Leiste
   * die grosse; das ist die richtige Reihenfolge fuer Aufrufer, die
   * keine kleinen Fassungen haben, aber fuer viele Bilder soll sie
   * gesetzt sein.
   */
  mini?: string;
  /**
   * Die volle Datei als Rueckfall, wenn `url` oder `mini` eine
   * Umrechnungs-Fassung ist und nicht laedt (lib/bild-adressen.ts).
   * Fehlt sie, gibt es keinen Rueckfall, dann ist `url` schon die
   * volle Datei.
   */
  voll?: string;
};

/** Kantenlaenge der Leisten-Quadrate in px, fuer das Mitrollen */
const QUADRAT = 60;

export default function BildAnsicht({
  bilder,
  index,
  aufIndex,
  aufSchliessen,
  titelbildZeigen = false,
}: {
  bilder: AnsichtBild[];
  index: number;
  aufIndex: (index: number) => void;
  aufSchliessen: () => void;
  /**
   * Nennt am ersten Bild zusaetzlich, dass es das Titelbild ist. Nur
   * fuer den Verkaeufer sinnvoll: Ein Interessent hat mit dem Begriff
   * nichts zu tun, fuer ihn ist es schlicht das erste Foto.
   */
  titelbildZeigen?: boolean;
}) {
  const beruehrung = useRef<{ x: number; y: number } | null>(null);
  const schliessen = useRef<HTMLButtonElement | null>(null);
  const leiste = useRef<HTMLDivElement | null>(null);
  const bild = bilder[index];
  /* Schliessen per Klick daneben und per Escape kommen aus dem
     gemeinsamen Baustein, siehe lib/bild-ansicht-verhalten. */
  const huelle = useBildAnsichtVerhalten(aufSchliessen);

  const zurueck = useCallback(
    () => aufIndex(Math.max(0, index - 1)),
    [aufIndex, index]
  );
  const weiter = useCallback(
    () => aufIndex(Math.min(bilder.length - 1, index + 1)),
    [aufIndex, index, bilder.length]
  );

  // Pfeiltasten und Escape am Rechner
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") weiter();
      if (e.key === "ArrowLeft") zurueck();
    };
    document.addEventListener("keydown", taste);
    return () => document.removeEventListener("keydown", taste);
  }, [aufSchliessen, weiter, zurueck]);

  /**
   * DIE LEISTE ROLLT MIT, damit das gezeigte Bild immer zu sehen ist,
   * auch beim zwoelften von fuenfzehn.
   *
   * BEWUSST VON HAND GERECHNET statt scrollIntoView: Das rollt auch
   * alle uebergeordneten Bereiche mit, und dann wandert die Seite
   * unter der Ansicht weg. Hier bewegt sich genau ein Element, die
   * Leiste selbst.
   *
   * OHNE FAHRT, mit Absicht. Zuerst stand hier ein weiches Gleiten.
   * Beim Durchspielen am 13.08.2026 bewegte sich die Leiste damit
   * gar nicht: Wo weiches Rollen nicht laeuft, bleibt der Kasten
   * einfach stehen, und dann ist das gezeigte Bild nicht zu sehen.
   * Eine Zusage der Bedienung darf nicht an einer Animation haengen.
   * Dazu kommt: Wer sich durch fuenfzehn Fotos blaettert, loest das
   * hier im Sekundentakt aus; eine Fahrt bei jedem Tastendruck waere
   * Zierde, die im Weg steht. Der Sprung braucht auch keine
   * Sonderbehandlung fuer eingestellte Ruhe, er IST schon ruhig.
   *
   * Merke: behavior "auto" heisst NICHT sofort, sondern "nimm die
   * CSS-Vorgabe". Sofort heisst "instant".
   */
  useEffect(() => {
    const stellen = () => {
      const box = leiste.current;
      if (!box) return;
      const ziel = index * (QUADRAT + 8) - box.clientWidth / 2 + QUADRAT / 2;
      box.scrollTo({ left: Math.max(0, ziel), behavior: "instant" });
    };
    stellen();
    /* AUCH BEIM DREHEN DES GERAETS: Sonst steht die Leiste nach dem
       Wechsel von hoch auf quer an der alten Stelle, und das gezeigte
       Bild ist wieder aus dem Blick. */
    window.addEventListener("resize", stellen);
    return () => window.removeEventListener("resize", stellen);
  }, [index]);

  /**
   * DER FOKUS KEHRT ZURUECK, WO ER WAR.
   *
   * Wer mit der Tastatur arbeitet, hat die Ansicht von einem
   * bestimmten Bild aus geoeffnet. Landet der Fokus beim Schliessen
   * wieder am Seitenanfang, muss er sich den ganzen Weg zurueck
   * tabben, und beim zweiten Mal laesst er es bleiben.
   *
   * Und die Seite darunter rollt nicht mit: Sonst wandert der
   * Hintergrund weg, waehrend man blaettert, und nach dem Schliessen
   * steht man woanders.
   */
  useEffect(() => {
    const vorher = document.activeElement as HTMLElement | null;
    const rollen = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    schliessen.current?.focus();
    return () => {
      document.body.style.overflow = rollen;
      vorher?.focus?.();
    };
  }, []);

  if (!bild) return null;

  const beschriftung = bild.name?.trim() || `Foto ${index + 1}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} von ${bilder.length}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#101214]/95 p-4 sm:p-6"
      {...huelle}
      // Wischen auf dem Handy: deutlicher waagerechter Zug blaettert
      onTouchStart={(e) => {
        beruehrung.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }}
      onTouchEnd={(e) => {
        const start = beruehrung.current;
        beruehrung.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) weiter();
          else zurueck();
        }
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 text-[#EDE9E3]">
        {/* Schlicht und klein, wie eine Seitenzahl */}
        <p className="text-[0.82rem] tabular-nums text-[#EDE9E3]/75">
          {index + 1} / {bilder.length}
        </p>
        <button
          ref={schliessen}
          type="button"
          onClick={aufSchliessen}
          aria-label="Schließen"
          className="rounded-full p-2 text-[#EDE9E3]/80 transition-colors hover:bg-white/10 hover:text-[#EDE9E3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X size={20} strokeWidth={1.8} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bild.url}
          alt={beschriftung}
          onError={(e) => aufVolleDateiZurueckfallen(e, bild.voll)}
          className="max-h-full w-auto min-w-0 max-w-full rounded-xl object-contain"
        />

        {/* Die Pfeile am Fensterrand, links und rechts weit aussen.
            Ohne Fuellung, damit sie auf dem dunklen Grund nicht als
            Knopfreihe auffallen; der Schlagschatten haelt sie lesbar,
            wenn ein helles Bild bis an den Rand reicht. */}
        <button
          type="button"
          aria-label="Vorheriges Foto"
          disabled={index === 0}
          onClick={zurueck}
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#EDE9E3]/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-colors hover:bg-white/10 hover:text-[#EDE9E3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronLeft size={26} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label="Nächstes Foto"
          disabled={index === bilder.length - 1}
          onClick={weiter}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#EDE9E3]/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-colors hover:bg-white/10 hover:text-[#EDE9E3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronRight size={26} strokeWidth={1.8} />
        </button>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Die Leiste: jedes Foto als Quadrat, ein Tipp springt hin    */}
      {/* ---------------------------------------------------------- */}
      {/*
        SIE STEHT AUCH BEI ZWEI UND BEI EINEM FOTO. Ueberlegt war, sie
        bei wenigen Bildern wegzulassen, weil zwei Quadrate wenig
        nuetzen. Am 13.08.2026 anders entschieden: Eine Leiste, die
        mal da ist und mal nicht, laesst den Menschen bei jedem Objekt
        neu suchen. Immer an derselben Stelle ist mehr wert als der
        eingesparte Streifen.

        DIE QUADRATE SIND KNOEPFE und liegen damit von selbst in der
        Tab-Reihenfolge. Die Pfeiltasten blaettern weiterhin durch die
        ganze Ansicht, und die Leiste zieht nach.
      */}
      <div className="shrink-0 pt-3">
        <div
          ref={leiste}
          role="group"
          aria-label="Alle Fotos"
          className="overflow-x-auto overscroll-x-contain"
        >
          {/* w-max mit mx-auto: Bei wenigen Bildern steht die Leiste
              mittig, bei vielen faengt sie links an und laesst sich
              schieben. */}
          <div className="mx-auto flex w-max gap-2">
            {bilder.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => aufIndex(i)}
                aria-label={b.name?.trim() || `Foto ${i + 1} anzeigen`}
                aria-current={i === index ? "true" : undefined}
                style={{ width: QUADRAT, height: QUADRAT }}
                className={`relative shrink-0 overflow-hidden rounded-lg transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                  i === index
                    ? "opacity-100 ring-2 ring-[#EDE9E3]"
                    : "opacity-50 hover:opacity-90"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.mini ?? b.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(e) => aufVolleDateiZurueckfallen(e, b.voll)}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Die Beschriftung ganz unten, ruhig und mittig */}
      <p className="shrink-0 truncate pt-3 text-center text-[0.85rem] text-[#EDE9E3]/80">
        {beschriftung}
        {titelbildZeigen && index === 0 ? (
          <span className="text-[#EDE9E3]/50"> · Titelbild</span>
        ) : null}
      </p>
    </div>
  );
}
