"use client";

import { m, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { nutztReduzierteBewegung } from "@/lib/reduzierte-bewegung";
import { siteConfig } from "@/site.config";
import { cn } from "@/lib/utils";

/**
 * Handgezogene Unterstreichung: Ein SVG-Pfad in Terrakotta zeichnet sich,
 * sobald das Wort in den sichtbaren Bereich scrollt (0,6 s).
 * Rein dekorativ, deshalb aria-hidden auf dem SVG.
 */
export default function HandDrawnUnderline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-18% 0px -18% 0px" });
  /* Hydrationssicherer Haken (Runde 31): Mit dem framer-Wert war
     `drawn` bei reduzierter Bewegung schon im ersten Client-Render
     true und die Strichlaenge wich vom Server-HTML ab. */
  const reduced = nutztReduzierteBewegung();
  const drawn = inView || reduced;

  return (
    <span ref={ref} className={cn("relative inline-block whitespace-nowrap", className)}>
      {children}
      <svg
        aria-hidden="true"
        className="absolute -bottom-[0.18em] left-0 h-[0.3em] w-full overflow-visible"
        viewBox="0 0 120 10"
        preserveAspectRatio="none"
        fill="none"
      >
        <m.path
          d="M3 7.2 C 26 3.4, 50 8.6, 72 5.8 C 88 3.8, 104 5.4, 117 5.0"
          stroke={siteConfig.colors.accent}
          strokeWidth={3.2}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: drawn ? 1 : 0.001 }}
          transition={reduced ? { duration: 0 } : { duration: 0.6, ease: "easeInOut", delay: 0.15 }}
        />
      </svg>
    </span>
  );
}
