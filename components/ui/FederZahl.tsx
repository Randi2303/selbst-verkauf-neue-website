"use client";

import { m, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useSyncExternalStore } from "react";
import { formatEuro } from "@/lib/utils";

/** Leeres Abo für useSyncExternalStore, der Wert ändert sich nie */
function subscribeNoop() {
  return () => {};
}

/**
 * Kleiner Roll-Effekt für Euro-Beträge: folgt dem Zielwert mit einer
 * Feder statt hart umzuspringen. Der Server rendert den statischen
 * Endwert, damit ohne JavaScript nie eine falsche Zahl steht. Bei
 * reduzierter Bewegung springt die Zahl direkt auf den neuen Wert.
 *
 * Genutzt vom Ersparnis-Rechner und vom Drei-Wege-Rechner im
 * ehrlichen Vergleich; die Bewegung erklärt dort jeweils, dass die
 * Zahl dem Regler folgt.
 */
export default function FederZahl({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const spring = useSpring(value, { stiffness: 160, damping: 26 });
  const text = useTransform(spring, (v) => formatEuro(Math.round(v)));
  useEffect(() => {
    if (reduced) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, reduced, spring]);
  if (!mounted) return <span className={className}>{formatEuro(value)}</span>;
  return <m.span className={className}>{text}</m.span>;
}
