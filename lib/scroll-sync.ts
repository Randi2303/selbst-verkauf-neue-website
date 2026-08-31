/**
 * Entkoppelt den Lenis-Provider vom GSAP-Bundle: SmoothScroll meldet
 * jede Scroll-Bewegung an registrierte Abnehmer, ohne selbst GSAP zu
 * importieren. Der Zeitstrahl registriert hier sein ScrollTrigger.update,
 * dadurch lädt GSAP nur noch auf Seiten, die es wirklich nutzen, und
 * erst mit deren Chunk statt im kritischen Start-JavaScript.
 */
type ScrollAbnehmer = () => void;

const abnehmer = new Set<ScrollAbnehmer>();

/** Abnehmer anmelden, Rückgabewert meldet wieder ab */
export function registriereScrollAbnehmer(callback: ScrollAbnehmer): () => void {
  abnehmer.add(callback);
  return () => {
    abnehmer.delete(callback);
  };
}

/** Wird vom SmoothScroll-Provider bei jeder Lenis-Scroll-Bewegung gerufen */
export function meldeScroll(): void {
  for (const callback of abnehmer) callback();
}
