"use client";

import { useEffect, useRef } from "react";

/**
 * Das Verhalten jeder grossen Bildansicht, an EINER Stelle.
 *
 * WARUM ES DIESE DATEI GIBT: Es gibt zwei Huellen, in denen ein Foto
 * gross aufgeht. components/foto/BildAnsicht (Objektmaske und
 * oeffentliche Objektseite) und die Foto-Galerie im Konto, die eigene
 * Werkzeuge traegt (Vergleichsregler, Verbessern, Loeschen). Die
 * Huellen duerfen getrennt bleiben, das Verhalten nicht: Am
 * 14.08.2026 schloss die eine per Klick daneben und die andere nicht,
 * und aufgefallen ist es erst beim Ausprobieren. Zwei Umsetzungen
 * derselben Sache laufen beim naechsten Umbau wieder auseinander.
 *
 * DER ANSPRUCH: Rundherum schliesst die Ansicht. Ausgenommen ist nur,
 * was man anfassen koennen muss.
 *
 * DIE HUELLEN HABEN DAFUER IHRE stopPropagation VERLOREN. Sie hatten
 * sie um den Bildbereich, die Leiste und die Knopfzeilen gelegt, und
 * damit schloss ein Klick in die Leerflaeche NEBEN dem Bild nicht,
 * obwohl genau das gemeint ist. Die Ausnahme regelt jetzt ANFASSBAR,
 * und die trifft das Bild und die Knoepfe, nicht ihre Umgebung.
 *
 * NICHT HIER DRIN steht, was jede Huelle fuer sich hat: Blaettern,
 * Wischen, Fokus-Rueckgabe, das Sperren des Seiten-Rollens. Das ist
 * kein gemeinsames Verhalten, sondern gehoert zur jeweiligen Ansicht.
 */

/**
 * Was einen Klick NICHT zum Schliessen macht.
 *
 * Bewusst eine Liste von Rollen statt einer Liste von Huellen: Wer
 * morgen einen Knopf ergaenzt, muss hier nichts nachtragen, und ein
 * vergessener Eintrag fuehrt nicht dazu, dass ein Knopf die Ansicht
 * zuklappt. "data-vergleich" kennzeichnet den Regler, der kein Knopf
 * ist, aber angefasst wird.
 */
const ANFASSBAR = "img, button, a, input, textarea, select, label, [data-vergleich]";

/** Wie weit der Zeiger zwischen Druck und Loslassen wandern darf */
const ZIEH_SCHWELLE = 14;

export function useBildAnsichtVerhalten(schliessen: () => void) {
  const druckStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliessen();
    };
    document.addEventListener("keydown", taste);
    return () => document.removeEventListener("keydown", taste);
  }, [schliessen]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      druckStart.current = { x: e.clientX, y: e.clientY };
    },
    onClick: (e: React.MouseEvent) => {
      const start = druckStart.current;
      druckStart.current = null;
      if ((e.target as HTMLElement).closest(ANFASSBAR)) return;
      /* GEGEN DAS VERSEHENTLICHE SCHLIESSEN am Ende einer
         Ziehbewegung: Wer den Vergleichsregler zieht und dabei ueber
         den Bildrand hinausgeraet, laesst ausserhalb los.

         DIE SCHWELLE IST GROSSZUEGIG, mit Absicht: Am Trackpad wandert
         der Zeiger beim Klicken leicht ein paar Pixel, und ein Klick,
         der nur bei ruhiger Hand zaehlt, fuehlt sich kaputt an. Wer
         wirklich zieht, bewegt sich um ein Vielfaches davon. */
      if (start && Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > ZIEH_SCHWELLE)
        return;
      schliessen();
    },
  };
}
