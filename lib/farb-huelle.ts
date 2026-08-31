"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Radix hängt Menüs, Dialoge und Schubladen standardmäßig an den
 * <body>. Damit liegen sie AUSSERHALB der Hülle von Konto und Admin,
 * an der die Klasse der Farbfassung sitzt, und würden hell erscheinen,
 * während die Seite dahinter dunkel ist. Deshalb wandern alle Portale
 * in die Hülle.
 *
 * WARUM EIN HOOK UND KEIN AUFRUF BEIM RENDERN: Genau das war der
 * Fehler, an dem das Nutzer-Menü starb. farbHuelle() lief mitten im
 * Rendern, und beim Wechsel zwischen Admin und Konto steht in diesem
 * Moment noch die Hülle des ALTEN Bereichs im Dokument. Sie wurde als
 * Portal-Ziel eingefroren und gleich darauf aus dem Dokument entfernt.
 * Das Menü öffnete danach in ein abgehängtes Element: aria-expanded
 * stand auf true, zu sehen war nichts, und weil Radix währenddessen
 * pointer-events auf dem <body> abschaltet, wirkte die ganze Seite
 * tot. Erst ein Neuladen half. Der Effekt unten läuft dagegen NACH dem
 * Einhängen, wenn nur noch die lebende Hülle im Dokument steht.
 *
 * WARUM [data-farbfassung] UND NICHT ".dunkel, .auto": Das Merkmal
 * sitzt in JEDER Fassung an der Hülle, auch in der hellen. Damit ist
 * das Portal-Ziel immer dasselbe Element, und ein Umschalten der
 * Fassung wirkt sofort auch auf offene Menüs, ohne dass irgendwer
 * neu suchen muss. In der hellen Fassung trägt die Hülle keine
 * Klasse, das Ergebnis ist dort also dasselbe wie am <body>.
 */
export function useFarbHuelle(): HTMLElement | undefined {
  const [huelle, setHuelle] = useState<HTMLElement | undefined>(undefined);
  // Layout-Effekt statt useEffect: Er läuft vor dem ersten Zeichnen.
  // Ein Dialog, der schon beim Einhängen offen ist (die Einführung),
  // erscheint damit sofort in der richtigen Hülle statt einen Wimpern-
  // schlag lang am <body>.
  useLayoutEffect(() => {
    /* Das setState hier ist GEWOLLT und genau einmal je Einhaengen:
       Es liest die Huelle erst, wenn die alte Seite aus dem Dokument
       ist, und stoesst dafuer bewusst ein einzelnes Nachrendern vor
       dem Zeichnen an. Beim Rendern gelesen waere es wieder der alte,
       gleich abgehaengte Anker, also genau der behobene Fehler. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHuelle(
      document.querySelector<HTMLElement>("[data-farbfassung]") ?? undefined
    );
  }, []);
  return huelle;
}
