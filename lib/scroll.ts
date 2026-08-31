import type Lenis from "lenis";

declare global {
  interface Window {
    /** Von SmoothScroll gesetzte Lenis-Instanz für sanfte Anker-Sprünge */
    __lenis?: Lenis;
  }
}

/** Fallback-Versatz für den Sticky-Header, wenn kein scroll-margin gesetzt ist */
export const HEADER_OFFSET = 96;

/**
 * Ziel-Position eines Ankers: Inhaltsbeginn mit Versatz unter dem
 * Sticky-Header. GEMEINSAME QUELLE für die Header-Navigation
 * (scrollToId) und das sanfte Einrasten (SektionsSnap), damit beide
 * exakt dieselbe Position ansteuern.
 *
 * Wichtig: Die Anker-IDs sitzen auf Sektionen mit großem Innenabstand
 * (py-24 bis py-32). Damit nach dem Scrollen nicht erst ein leerer
 * Bereich steht, zielt der Scroll auf den Inhaltsbeginn (Oberkante plus
 * Innenabstand). Die Luft unter dem Sticky-Header kommt aus dem
 * scroll-margin-top des Elements, so bleiben CSS und JS konsistent.
 */
export function scrollZielPosition(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  const padTop = parseFloat(style.paddingTop) || 0;
  // Große Innenabstände überspringen, kleine (unter 48 px) gehören zum Inhalt
  const contentOffset = padTop >= 48 ? padTop : 0;
  const margin = parseFloat(style.scrollMarginTop) || HEADER_OFFSET;
  return Math.max(0, el.getBoundingClientRect().top + window.scrollY + contentOffset - margin);
}

/** Sanft zu einer Sektion scrollen, mit Fallback ohne Lenis. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = scrollZielPosition(el);

  if (window.__lenis && !reduced) {
    window.__lenis.scrollTo(top, { duration: 1.2 });
  } else {
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }
  // Bewusst kein history.replaceState: Das würde mit dem internen
  // Router-State von Next kollidieren. Die Links selbst tragen den Hash.
}
