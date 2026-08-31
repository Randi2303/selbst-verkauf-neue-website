"use client";

import { m } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useEinblendung } from "@/lib/einblenden";

type RevealProps = {
  children: ReactNode;
  /** Verzögerung in Sekunden, für gestaffelte Reihen */
  delay?: number;
  /** Startversatz nach unten in Pixeln */
  y?: number;
  /** Startversatz zur Seite in Pixeln (z. B. Problem/Lösung) */
  x?: number;
  className?: string;
};

/**
 * Sanftes Einfaden beim Scrollen.
 *
 * DER SERVER LIEFERT SICHTBAR (Runde 32). Frueher stand hier
 * `initial={false}` mit der Begruendung, das sorge fuer sichtbares
 * Server-HTML. Das war falsch: `initial={false}` unterdrueckt nur die
 * Anfangs-ANIMATION und springt direkt auf den animate-Wert, und der
 * war auf dem Server `opacity:0` (useInView meldet dort immer false).
 * Ohne JavaScript blieb der Inhalt damit dauerhaft unsichtbar.
 * Zustaende und Regeln stehen in lib/einblenden.ts.
 */
export default function Reveal({ children, delay = 0, y = 28, x = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const zustand = useEinblendung(ref, "-12% 0px -8% 0px");
  /* "ruhe" (Server, erster Aufbau, reduzierte Bewegung) und "an" sind
     sichtbar; nur "versteckt" wartet, und das ausschliesslich
     ausserhalb des Blickfelds. Bewegt wird nur beim Einblenden. */
  const sichtbar = zustand !== "versteckt";

  return (
    <m.div
      ref={ref}
      className={className}
      initial={false}
      animate={sichtbar ? { opacity: 1, y: 0, x: 0 } : { opacity: 0, y, x }}
      transition={
        zustand === "an"
          ? { duration: 0.65, delay, ease: [0.22, 0.61, 0.36, 1] }
          : { duration: 0 }
      }
    >
      {children}
    </m.div>
  );
}
