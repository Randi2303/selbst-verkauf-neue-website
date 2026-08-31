"use client";

import { m } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useEinblendung } from "@/lib/einblenden";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  /** Jede Zeile fadet beim Scrollen gestaffelt ein */
  lines: ReactNode[];
  sub?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

/**
 * Sektionsüberschrift: kleines Versal-Label, H2 in Fraunces mit
 * zeilenweise gestaffeltem Einfaden, optionale Subline.
 *
 * DER SERVER LIEFERT SICHTBAR (Runde 32): Frueher zog `shown` seinen
 * Wert direkt aus useInView, der auf dem Server immer false ist. Damit
 * standen die Ueberschriften der halben Startseite mit `opacity:0` im
 * ausgelieferten HTML (39 der 96 gemessenen Faelle: 20 H2-Zeilen, 10
 * Augenbrauen, 9 Unterzeilen) und blieben ohne JavaScript unsichtbar.
 * Zustaende und Regeln stehen in lib/einblenden.ts.
 */
export default function SectionHeading({
  eyebrow,
  lines,
  sub,
  align = "left",
  className,
}: SectionHeadingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const zustand = useEinblendung(ref, "-14% 0px -10% 0px");
  const shown = zustand !== "versteckt";
  /* Bewegt wird nur beim Einblenden. In "ruhe" (Server, erster Aufbau,
     reduzierte Bewegung) steht die Ueberschrift ohne Uebergang. */
  const bewegt = zustand === "an";

  return (
    <div
      ref={ref}
      className={cn(align === "center" && "text-center", className)}
    >
      {eyebrow ? (
        <m.span
          className="eyebrow inline-block"
          initial={false}
          animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 14 }}
          transition={bewegt ? { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] } : { duration: 0 }}
        >
          {eyebrow}
        </m.span>
      ) : null}
      <h2 className={cn("font-heading text-h2 opsz-display text-ink", eyebrow ? "mt-4" : null)}>
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <m.span
              className="block"
              initial={false}
              animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : "70%" }}
              transition={
                bewegt
                  ? { duration: 0.6, delay: 0.08 + i * 0.1, ease: [0.22, 0.61, 0.36, 1] }
                  : { duration: 0 }
              }
            >
              {line}
            </m.span>
          </span>
        ))}
      </h2>
      {sub ? (
        <m.p
          className={cn(
            "mt-5 max-w-2xl text-[1.08rem] leading-relaxed text-ink-muted",
            align === "center" && "mx-auto"
          )}
          initial={false}
          animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 16 }}
          transition={bewegt ? { duration: 0.6, delay: 0.28, ease: [0.22, 0.61, 0.36, 1] } : { duration: 0 }}
        >
          {sub}
        </m.p>
      ) : null}
    </div>
  );
}
