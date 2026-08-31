"use client";

import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * DAS Muster für Erklärungen im ganzen Kundenbereich. Es gibt kein
 * zweites daneben.
 *
 * Ein unaufdringliches Info-Zeichen, das auf Wunsch mehr sagt:
 *
 * - Am Rechner ein kleines Feld direkt am Zeichen. Es hängt am Ort der
 *   Frage, nichts springt, das Layout bleibt stehen.
 * - Am Handy eine ruhige Fläche von unten. Ein 60 Pixel breites
 *   Sprechblasen-Kästchen ist auf einem 390 Pixel breiten Bildschirm
 *   keine Erklärung, sondern eine Zumutung: zu schmal für zwei Sätze,
 *   zu klein zum Treffen, und es verschwindet beim ersten Wischen.
 *   Die Fläche von unten ist dieselbe Bewegung, die das Menü und die
 *   Auswahlfelder dort schon benutzen.
 *
 * WAS ES NIE IST: ein Warnhinweis. Kein Rahmen in Signalfarbe, kein
 * Ausrufezeichen, kein Rot. Wer hier klickt, ist neugierig, nicht in
 * Not.
 *
 * Die Positionierung (relative oder absolute) kommt über className vom
 * Verwender, damit das Zeichen auch als Überlagerung ohne Einfluss auf
 * die Layout-Höhe platziert werden kann.
 */

/**
 * Ist der Bildschirm schmal? Bewusst erst nach dem Einhängen ermittelt:
 * Auf dem Server gibt es keine Fensterbreite, und geraten wird nicht.
 * Bis zur ersten Messung gilt die Rechner-Ansicht; geöffnet wird
 * ohnehin frühestens nach einem Klick, und da steht der Wert längst.
 */
function useSchmalerBildschirm(): boolean {
  const [schmal, setSchmal] = useState(false);
  useEffect(() => {
    const abfrage = window.matchMedia("(max-width: 639px)");
    const setzen = () => setSchmal(abfrage.matches);
    setzen();
    abfrage.addEventListener("change", setzen);
    return () => abfrage.removeEventListener("change", setzen);
  }, []);
  return schmal;
}

/**
 * ABSAETZE AUS LEERZEILEN (21.08.2026).
 *
 * Bis dahin ging der Text als EIN Stueck in die Blase, und eine
 * Leerzeile darin verschwand: whitespace-normal faltet sie weg. Seit
 * die Verkaufs-Checkliste ihren Mechanik-Satz hinter das Zeichen legt
 * ("Erledigt sich von selbst, sobald ..."), braucht es einen zweiten
 * Absatz, sonst klebte der Satz an der Erklaerung und laese sich wie
 * deren Fortsetzung.
 *
 * Wer keine Leerzeile schreibt, merkt von der Aenderung nichts: Ein
 * Text ohne Leerzeile bleibt genau ein Absatz.
 */
function absaetze(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function InfoTipp({
  text,
  titel = "Wozu ist das gut?",
  className,
  richtung = "oben",
  beschriftung = "Erklärung anzeigen",
}: {
  text: string;
  /** Überschrift der Fläche am Handy. Am Rechner nicht sichtbar. */
  titel?: string;
  className?: string;
  /** Öffnungsrichtung am Rechner, "unten" für Leisten am Seitenkopf */
  richtung?: "oben" | "unten";
  /** Vorlesetext des Zeichens, sagt WOZU es gehört */
  beschriftung?: string;
}) {
  const [offen, setOffen] = useState(false);
  const schmal = useSchmalerBildschirm();

  // Ohne eigene Positions-Klasse ankert das Feld am Zeichen selbst,
  // sonst hinge es am nächstbesten positionierten Vorfahren
  const hatPosition = /(?:^|\s)(?:absolute|fixed|relative|sticky)(?:\s|$)/.test(
    className ?? ""
  );

  return (
    <span className={cn("inline-flex", !hatPosition && "relative", className)}>
      <button
        type="button"
        aria-label={beschriftung}
        aria-expanded={offen}
        /* title nur am Rechner sinnvoll; am Handy gibt es kein Schweben */
        title={schmal ? undefined : text}
        onClick={(e) => {
          e.stopPropagation();
          setOffen((v) => !v);
        }}
        /* Am Handy schliesst die Flaeche ueber ihren eigenen Weg. Ein
           Verlust des Fokus wuerde sie beim Oeffnen sofort wieder
           zumachen. */
        onBlur={schmal ? undefined : () => setOffen(false)}
        /* 24px-Trefferfläche bei unveränderter Optik am Rechner, am
           Handy die vollen 44px, die ein Daumen braucht */
        className="-m-0.5 flex size-6 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 max-sm:-m-2.5 max-sm:size-11"
      >
        <Info size={13} strokeWidth={2.2} />
      </button>

      {offen && !schmal ? (
        <span
          role="tooltip"
          className={cn(
            /* whitespace-normal ist hier PFLICHT, kein Stilwunsch: Das
               Zeichen steht oft in einem whitespace-nowrap-Span (die
               Verankerung am letzten Wort, damit es nie allein
               umbricht), und die Blase ERBTE dieses Umbruchverbot. Ihr
               Text lief dann als eine einzige Zeile aus der Box quer
               ueber den ganzen Bildschirm. */
            "absolute right-0 z-20 w-[19rem] max-w-[calc(100vw-2rem)] whitespace-normal rounded-xl border border-line bg-paper px-3 py-2.5 text-left text-[0.78rem] font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lift",
            richtung === "oben" ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          {absaetze(text).map((absatz, i) => (
            <span key={i} className={cn("block", i > 0 && "mt-2")}>
              {absatz}
            </span>
          ))}
        </span>
      ) : null}

      {schmal ? (
        <Sheet open={offen} onOpenChange={setOffen}>
          <SheetContent side="bottom" titel={titel}>
            {absaetze(text).map((absatz, i) => (
              <p
                key={i}
                className={cn(
                  "pb-2 text-left text-[0.95rem] font-normal normal-case leading-relaxed tracking-normal text-ink",
                  i > 0 && "pt-1"
                )}
              >
                {absatz}
              </p>
            ))}
          </SheetContent>
        </Sheet>
      ) : null}
    </span>
  );
}
