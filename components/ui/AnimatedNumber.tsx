"use client";

import { animate, m, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn, formatNumber } from "@/lib/utils";

type AnimatedNumberProps = {
  value: number;
  /** Dauer des Hochzählens in Sekunden */
  duration?: number;
  delay?: number;
  className?: string;
  /** Eigene Formatierung, Standard ist deutsches Zahlenformat */
  format?: (value: number) => string;
};

/**
 * Zählt beim Sichtbarwerden weich von 0 auf den Zielwert.
 * Serverseitig steht der Endwert im HTML, damit ohne JavaScript
 * nie eine leere Zahl zu sehen ist. Tabellarische Ziffern verhindern
 * das Springen während des Zählens.
 */
export default function AnimatedNumber({
  value,
  duration = 1.4,
  delay = 0,
  className,
  format = formatNumber,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  const text = useTransform(motionValue, (v) => format(Math.round(v)));
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      motionValue.set(value);
      return;
    }
    // Umschalten auf die zählende Anzeige im nächsten Frame,
    // damit im Effect selbst kein synchrones setState nötig ist
    const frame = requestAnimationFrame(() => setRunning(true));
    const controls = animate(motionValue, value, { duration, delay, ease: "easeOut" });
    return () => {
      cancelAnimationFrame(frame);
      controls.stop();
    };
  }, [inView, reduced, value, duration, delay, motionValue]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {running ? <m.span className="tabular-nums">{text}</m.span> : format(value)}
    </span>
  );
}
