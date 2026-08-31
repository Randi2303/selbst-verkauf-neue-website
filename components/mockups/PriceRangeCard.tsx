"use client";

import { m, useSpring, useTransform } from "framer-motion";
import { ohneAblauf, useEinblendung } from "@/lib/einblenden";
import { useEffect, useRef } from "react";
import { siteConfig } from "@/site.config";

/** Weich hochzählende Zahl, startet kurz unter dem Zielwert */
function ZaehlZahl({ start, ziel, los }: { start: number; ziel: number; los: boolean }) {
  const spring = useSpring(start, { stiffness: 60, damping: 20 });
  const text = useTransform(spring, (v) =>
    new Intl.NumberFormat("de-DE").format(Math.round(v / 1000) * 1000)
  );
  useEffect(() => {
    if (los) spring.set(ziel);
  }, [los, ziel, spring]);
  return <m.span className="tabular-nums">{text}</m.span>;
}

/**
 * Preisspannen-Karte neben Schritt 2: realistische Spanne mit Empfehlung.
 * Beim ersten Sichtbarwerden zählen die Werte hoch, der Spannen-Balken
 * wächst auf und der Empfehlungs-Punkt gleitet mit leichtem Überschwung
 * von "vorsichtig" zur Empfehlung. Rein dekorativ, bei reduzierter
 * Bewegung steht sofort der Endzustand.
 */
export default function PriceRangeCard() {
  const ref = useRef<HTMLDivElement>(null);
  /* OHNE JAVASCRIPT STEHT DIE FERTIGE KARTE (Runde 32): `on` kam
     frueher aus useInView, der auf dem Server immer false meldet; der
     Empfehlungs-Punkt lag damit mit Deckkraft 0 im Server-HTML und der
     Spannen-Balken mit scaleX 0. Der Zweig unten waehlt weiterhin je
     nach Zustand einen anderen Baum, aber "ruhe" gilt auf dem Server
     UND im ersten Aufbau, der bleibt also deckungsgleich. Siehe
     lib/einblenden.ts. */
  const zustand = useEinblendung(ref, "-18% 0px");
  const on = zustand !== "versteckt";
  const steht = ohneAblauf(zustand);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="w-full max-w-[350px] rounded-2xl border border-line/70 bg-paper p-6"
      style={{
        boxShadow:
          "0 1px 2px rgba(35, 39, 42, 0.05), 0 18px 36px -20px rgba(35, 39, 42, 0.25)",
      }}
    >
      <p className="text-[0.9rem] font-semibold">Realistische Preisspanne</p>
      <p className="mt-2 text-[1.05rem] font-semibold tabular-nums">
        {steht ? (
          <>460.000 bis 510.000 €</>
        ) : (
          <>
            <ZaehlZahl start={420_000} ziel={460_000} los={on} /> bis{" "}
            <ZaehlZahl start={470_000} ziel={510_000} los={on} /> €
          </>
        )}
      </p>
      <div className="relative mt-5 h-2 rounded-full bg-surface">
        {/* Spannen-Balken wächst von links auf */}
        <m.div
          className="absolute inset-y-0 left-[16%] right-[12%] origin-left rounded-full bg-primary/75"
          initial={false}
          animate={{ scaleX: on ? 1 : 0 }}
          transition={steht ? { duration: 0 } : { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        />
        {/* Empfehlungs-Punkt gleitet zur Empfehlung und setzt weich auf.
            Zentrierung über Margins, denn Framer verwaltet transform selbst */}
        <m.span
          className="absolute h-4 w-4 rounded-full border-[3px] border-paper bg-accent shadow-soft"
          style={{ left: "54%", marginLeft: "-8px", top: "50%", marginTop: "-8px" }}
          initial={false}
          animate={{ x: on ? 0 : -96, opacity: on ? 1 : 0 }}
          transition={
            steht
              ? { duration: 0 }
              : { delay: 0.3, type: "spring", stiffness: 120, damping: 14 }
          }
        />
      </div>
      <div className="mt-2.5 flex justify-between text-[0.7rem] text-ink-muted">
        <span>vorsichtig</span>
        <span>empfohlen</span>
        <span>ambitioniert</span>
      </div>
      <p className="mt-5 border-t border-line/60 pt-4 text-[0.78rem] text-ink-muted">
        Auf Basis von Lage, Zustand und aktuellen Abschlüssen.
      </p>
      <p className="mt-1.5 text-[0.72rem] text-ink-muted">
        Datenbasis:{" "}
        {siteConfig.valuationPartner.show
          ? siteConfig.valuationPartner.name
          : "unser Bewertungspartner"}
      </p>
    </div>
  );
}
