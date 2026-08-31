"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Snap from "lenis/snap";
import { scrollZielPosition } from "@/lib/scroll";

/**
 * Sanftes Einrasten an Abschnittsanfängen, auf ALLEN Seiten: Wer
 * scrollt, kommt frei überall hin; endet die Bewegung aber nah an einem
 * Abschnittsanfang, gleitet die Seite in 0,4 s exakt an die Position,
 * die auch ein Klick in der Navigation ansteuern würde (gemeinsame
 * Quelle scrollZielPosition in lib/scroll.ts). Näherungs-Einrasten,
 * kein Zwang: Außerhalb des Schwellwerts passiert nichts, und jede neue
 * Eingabe bricht das Gleiten sofort ab (lenis scrollTo ohne lock).
 *
 * Snap-Punkte: jede Sektion unter main plus die vier Schritte des
 * Zeitstrahls (#schritt-1 bis #schritt-4). Seiten ohne Sektionen
 * (Rechtstexte, /register) sind reine Lesespalten, dort gibt es bewusst
 * keine Punkte und damit völlig freies Scrollen.
 *
 * Programmatischen Scrolls (Navigation, Phasenwechsel im Konfigurator)
 * funkt das Einrasten nie dazwischen: lenis/snap horcht nur auf echte
 * Eingaben (virtual-scroll), nicht auf scrollTo-Aufrufe.
 *
 * Touch-Geräte bleiben außen vor: Dort scrollt die Seite nativ mit
 * System-Momentum (Lenis glättet Touch nicht), ein nachträgliches
 * automatisches Gleiten würde sich wie Kontrollverlust anfühlen. Ohne
 * feinen Zeiger wird daher gar nicht erst initialisiert. Bei
 * prefers-reduced-motion existiert kein Lenis, das Einrasten bleibt
 * automatisch aus.
 */
export default function SektionsSnap() {
  const pathname = usePathname();

  useEffect(() => {
    if (!window.matchMedia("(any-pointer: fine)").matches) return;

    let snap: Snap | null = null;
    const abmelden: Array<() => void> = [];
    let neuAufbau: ReturnType<typeof setTimeout> | undefined;
    let warteTimer: ReturnType<typeof setInterval> | undefined;

    /*
     * Snap-Punkte als feste Positionen registrieren, berechnet mit
     * derselben Funktion wie die Anker-Navigation. Nach jeder
     * Layout-Änderung (Lazy-Chunks, FAQ-Aufklapper, Phasenwechsel,
     * Fenstergröße) werden alle Punkte neu vermessen.
     */
    const registriere = () => {
      if (!snap) return;
      for (const entfernen of abmelden.splice(0)) entfernen();
      const elemente = document.querySelectorAll<HTMLElement>(
        "main section, #schritt-1, #schritt-2, #schritt-3, #schritt-4"
      );
      const werte = new Set<number>();
      for (const el of elemente) {
        if (el.getClientRects().length === 0) continue;
        werte.add(Math.round(scrollZielPosition(el)));
      }
      for (const wert of werte) abmelden.push(snap.add(wert));
    };

    const planeNeuaufbau = () => {
      clearTimeout(neuAufbau);
      neuAufbau = setTimeout(registriere, 250);
    };
    const beobachter = new ResizeObserver(planeNeuaufbau);

    /*
     * Auf Lenis warten: Der Provider im Layout initialisiert erst nach
     * den Kind-Effekten (React läuft von unten nach oben), außerdem
     * fehlt Lenis bei prefers-reduced-motion ganz.
     */
    const starte = () => {
      const lenis = window.__lenis;
      if (!lenis) return false;
      snap = new Snap(lenis, {
        type: "proximity",
        // Nur einrasten, wenn der Abschnittsanfang wirklich nah ist
        distanceThreshold: "18%",
        duration: 0.4,
        debounce: 350,
      });
      registriere();
      beobachter.observe(document.body);
      window.addEventListener("resize", planeNeuaufbau);
      return true;
    };

    if (!starte()) {
      let versuche = 0;
      warteTimer = setInterval(() => {
        versuche += 1;
        if (starte() || versuche > 40) clearInterval(warteTimer);
      }, 150);
    }

    return () => {
      if (warteTimer) clearInterval(warteTimer);
      clearTimeout(neuAufbau);
      beobachter.disconnect();
      window.removeEventListener("resize", planeNeuaufbau);
      for (const entfernen of abmelden) entfernen();
      snap?.destroy();
    };
  }, [pathname]);

  return null;
}
