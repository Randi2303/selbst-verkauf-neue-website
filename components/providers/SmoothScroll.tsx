"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { scrollToId } from "@/lib/scroll";
import { meldeScroll } from "@/lib/scroll-sync";

/**
 * Sanftes Scrollen mit Lenis. Scroll-Abnehmer (z. B. ScrollTrigger des
 * Zeitstrahls) melden sich über lib/scroll-sync.ts an, dadurch bleibt
 * dieser globale Provider frei von GSAP.
 * Bei prefers-reduced-motion bleibt natives Scrollen aktiv.
 *
 * WICHTIG: Lenis läuft nur auf der Website. In Konto und Admin bleibt
 * das Scrollen nativ, denn Lenis fängt die Rad-Ereignisse der ganzen
 * Seite ab; eingebettete Scrollbereiche (Textfelder, Chat-Verläufe)
 * bekommen sie dann nie zu sehen, und Formularseiten fühlen sich
 * durch die Trägheits-Animation hakelig an. Grundregel dazu im
 * Projekt: Jeder Bereich, dessen Inhalt länger sein kann als sein
 * Rahmen, braucht einen eigenen Scrollbereich (overflow-y-auto plus
 * overscroll-contain), und auf Lenis-Seiten zusätzlich
 * data-lenis-prevent.
 */
export default function SmoothScroll() {
  const pathname = usePathname();
  const isHistoryNavRef = useRef(false);
  const internerBereich =
    pathname.startsWith("/konto") || pathname.startsWith("/admin");

  // Zurück/Vor im Browser merken: Dort soll die normale
  // Scroll-Wiederherstellung greifen, kein Sprung nach oben
  useEffect(() => {
    const onPop = () => {
      isHistoryNavRef.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Bei jedem Routenwechsel sofort und ohne Animation nach oben.
  // Lenis würde sonst die Scroll-Wiederherstellung des App Routers
  // übersteuern und Seiten öffnen mitten im Inhalt.
  // Ausnahmen: Anker-Ziele (übernimmt der Effekt darunter) und
  // Zurück/Vor-Navigation (Browser-Restauration bleibt unangetastet).
  useEffect(() => {
    if (isHistoryNavRef.current) {
      isHistoryNavRef.current = false;
      return;
    }
    if (window.location.hash) return;
    window.__lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  // Anker-Ziel nach Seitenwechseln ansteuern (z. B. /leistungen zu /#vergleich),
  // Next scrollt bei Client-Navigation nicht zuverlässig zum Hash.
  // Es wird gewartet, bis das Ziel-Element wirklich im DOM steht (die
  // Zielseite kann noch laden), dann Lenis-Maße auffrischen und scrollen.
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      const el = document.getElementById(id);
      if (el) {
        clearInterval(interval);
        window.__lenis?.resize();
        scrollToId(id);
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [pathname]);
  useEffect(() => {
    if (internerBereich) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
    });
    window.__lenis = lenis;

    // Lenis hält alle angemeldeten Scroll-Abnehmer auf Stand. Eigener
    // rAF-Loop statt gsap.ticker: Der Ticker konnte je nach Seite
    // einschlafen, dann liefen animierte Lenis-Fahrten (Anker,
    // Logo-Klick) ins Leere.
    lenis.on("scroll", meldeScroll);
    let rafId = requestAnimationFrame(function loop(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    });

    /**
     * EIN Abnehmer für ALLE Sprungmarken, solange Lenis läuft.
     *
     * WARUM ZENTRAL: Sobald Lenis aktiv ist, steht in globals.css
     * `scroll-behavior: auto !important`, und Lenis schreibt seine
     * eigene Position in jedem Bild zurück. Ein blosses
     * `<a href="#ziel">` bewegt die Seite dann nicht mehr; der Hash
     * wandert in die Adresszeile und sonst geschieht nichts.
     *
     * Bis hierher stand die Gegenmassnahme an jedem Link einzeln
     * (preventDefault plus scrollToId, siebenmal wiederholt). Drei
     * Sprungmarken hatten sie nicht: der Knopf "Anfrage stellen" und
     * die Leiste der Objektseite, sowie der Sprunglink "Zum Inhalt
     * springen" ganz oben im Rahmen, also ausgerechnet der Weg für
     * Tastatur und Screenreader. Eine Vorkehrung, die man an jeder
     * neuen Stelle wiederholen muss, wird irgendwann vergessen.
     * Deshalb hier einmal fuer alle.
     */
    const aufKlick = (ereignis: MouseEvent) => {
      if (ereignis.defaultPrevented) return;
      /* Nur der einfache linke Klick. Mittlere Taste, Strg und Befehl
         oeffnen einen neuen Tab, und das soll so bleiben. */
      if (ereignis.button !== 0) return;
      if (ereignis.metaKey || ereignis.ctrlKey || ereignis.shiftKey || ereignis.altKey)
        return;

      const link = (ereignis.target as Element | null)?.closest?.("a");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      const ziel = link.getAttribute("href");
      if (!ziel || !ziel.startsWith("#") || ziel.length < 2) return;

      const id = decodeURIComponent(ziel.slice(1));
      const el = document.getElementById(id);
      if (!el) return;

      ereignis.preventDefault();
      scrollToId(id);

      /* Der Fokus muss mitwandern, sonst liest ein Screenreader nach
         dem Sprung weiter an der alten Stelle und die naechste
         Tabulator-Taste springt dorthin zurueck. Das native Verhalten
         erledigt das; wir haben es mit preventDefault abgeschaltet und
         holen es hier nach. tabindex nur setzen, wo keiner steht, und
         hinterher wieder abraeumen, damit die Seite keine neuen
         Fokusstationen bekommt. */
      const warFokussierbar = el.hasAttribute("tabindex");
      if (!warFokussierbar) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
      if (!warFokussierbar) {
        el.addEventListener("blur", () => el.removeAttribute("tabindex"), {
          once: true,
        });
      }
    };
    document.addEventListener("click", aufKlick);

    return () => {
      document.removeEventListener("click", aufKlick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.__lenis = undefined;
    };
    // Beim Wechsel Website <-> Konto/Admin wird Lenis auf- bzw. abgebaut
  }, [internerBereich]);

  return null;
}
