"use client";

import { useEffect, useState, type RefObject } from "react";

export type Einblendung = "ruhe" | "steht" | "versteckt" | "an";

/**
 * Einblenden beim Scrollen, HYDRATIONSSICHER und OHNE unsichtbaren Start.
 *
 * =====================================================================
 * DAS PROBLEM, DAS DIESER HAKEN LOEST (Runde 32, 26.08.2026)
 * =====================================================================
 * Reveal und SectionHeading haben ihren Sichtbarkeits-Zustand frueher
 * direkt aus `useInView` gezogen. Auf dem Server ist der immer false,
 * also lieferte das Server-HTML `opacity:0` aus: gemessen 70 von 96
 * unsichtbar startenden Elementen der Startseite und alle 13 der
 * Team-Seite. Wer die Seite ohne JavaScript oeffnet, mit einem
 * Lesegeraet liest oder dessen Skript nicht ausgefuehrt wird, sah an
 * diesen Stellen NICHTS, obwohl der Text im HTML steht. Der Kommentar
 * in Reveal versprach seit jeher das Gegenteil; `initial={false}`
 * unterdrueckt nur die Anfangs-ANIMATION und springt direkt auf den
 * animate-Wert, es liefert kein sichtbares HTML.
 *
 * DAS MUSTER (uebernommen von der Randnotiz aus Runde 27, siehe
 * components/sections/AnfragenSektion.tsx):
 *
 *   "ruhe"      Server-HTML UND erster Client-Render. Vollstaendig
 *               sichtbar, ohne Versatz, ohne Uebergang. Damit ist der
 *               erste Aufbau immer deckungsgleich mit dem Server, und
 *               ohne JavaScript bleibt es fuer immer bei diesem Stand.
 *   "steht"     Nach dem Mount, war beim Aufwachen schon im Blick.
 *               Bleibt sichtbar und bewegt sich nie (siehe Punkt 1).
 *   "versteckt" Erst NACH dem Mount, und nur ohne reduzierte Bewegung,
 *               und nur fuer Elemente, die gerade NICHT im Blick sind.
 *   "an"        Einmaliges Einblenden beim ersten Sichtkontakt.
 *
 * WER NUR "SICHTBAR ODER NICHT" BRAUCHT, fragt `zustand !==
 * "versteckt"`. Wer wissen muss, ob eine Bewegung LAEUFT (Zaehlwerke,
 * Choreografien mit eigenem Anfangsbild), fragt `zustand === "an"`:
 * Nur dort ist ein Ablauf von vorn richtig, "steht" und "ruhe" zeigen
 * den Endzustand.
 *
 * ZWEI EIGENSCHAFTEN, DIE NICHT VERHANDELBAR SIND:
 *
 * 1. WER BEIM AUFWACHEN SCHON IM BLICK IST, WIRD NIE VERSTECKT.
 *    Sonst blitzt der Inhalt im ersten Bildschirm auf und verschwindet
 *    wieder, bevor er einblendet. Solche Elemente stehen sofort; sie
 *    haben ihre Einblendung frueher ohnehin erst nach dem Laden von
 *    JavaScript bekommen, jetzt stehen sie eben von Anfang an.
 * 2. REDUZIERTE BEWEGUNG AENDERT DEN BAUM NICHT.
 *    Die Einstellung wird hier NUR im Effekt gelesen, nie im Render.
 *    Wer sie gesetzt hat, bleibt dauerhaft in "ruhe": alles steht, es
 *    bewegt sich nichts, und der erste Aufbau gleicht dem Server.
 *    Siehe lib/reduzierte-bewegung.ts fuer die gleiche Regel.
 *
 * @param ref        Das beobachtete Element.
 * @param rootMargin Vorlauf des Sichtkontakts, wie bei useInView.
 */
/**
 * Steht hier der Endzustand, ohne dass ein Ablauf spielt? Wahr in
 * "ruhe" (Server, erster Aufbau, reduzierte Bewegung) und in "steht"
 * (war beim Aufwachen schon im Blick). Fuer Bausteine mit eigener
 * Choreografie, die dann sofort ihr Schlussbild zeigen muessen.
 */
export function ohneAblauf(zustand: Einblendung): boolean {
  return zustand === "ruhe" || zustand === "steht";
}

export function useEinblendung(
  ref: RefObject<HTMLElement | null>,
  rootMargin: string
): Einblendung {
  const [zustand, setZustand] = useState<Einblendung>("ruhe");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* Schon im Blick? Dann bleibt es stehen, statt aufzublitzen. */
    const masse = el.getBoundingClientRect();
    if (masse.top < window.innerHeight && masse.bottom > 0) {
      setZustand("steht");
      return;
    }

    setZustand("versteckt");
    const beobachter = new IntersectionObserver(
      (eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) {
          setZustand("an");
          beobachter.disconnect();
        }
      },
      { rootMargin }
    );
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [ref, rootMargin]);

  return zustand;
}
