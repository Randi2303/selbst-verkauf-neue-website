"use client";

import { domAnimation, LazyMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Schlanker framer-motion-Modus: Alle Komponenten nutzen m.* statt
 * motion.*, die Animations-Features kommen einmalig aus diesem Provider
 * (domAnimation). Das spart rund die Hälfte des framer-Anteils im
 * kritischen Start-JavaScript.
 *
 * Bewusste Ausnahme mit vollem motion-Import (Layout-Features, die in
 * domAnimation nicht enthalten sind): Pricing.tsx (layoutId der
 * Umschalt-Pille). Sie liegt in einem lazy geladenen Chunk, deshalb
 * bleibt der kritische Pfad trotzdem schlank. PhoneChatMockup, die
 * zweite Ausnahme, ist mit der Schaufenster-Runde 24.08.2026
 * gefallen (ChatTelefon kommt mit domAnimation aus). Kein
 * strict-Modus, genau damit dieser Mischbetrieb erlaubt ist.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
