"use client";

import { m } from "framer-motion";
import { useEinblendung } from "@/lib/einblenden";
import { CheckCircle2, Video } from "lucide-react";
import { useRef } from "react";
import { NACHWEIS_WORTE } from "@/config/nachweis-woerter";
import { TERMIN_ARTEN } from "@/lib/termin-arten";

/*
 * Terminkarte neben Schritt 4. Die Chips tragen die Woerter des
 * Produkts und kommen aus seinen Quellen: der Nachweis-Stand aus
 * config/nachweis-woerter.ts (dieselbe Quelle wie lib/bonitaet.ts),
 * die Terminart aus lib/termin-arten.ts. Die fruehere Fassung sagte
 * "Nachweis liegt vor" und "Makler zugeschaltet", beides gibt es im
 * Konto so nicht (Bestandsaufnahme 23.08.2026).
 *
 * Datum, Uhrzeit und Familie Berger sind Beispieldaten; die
 * Kennzeichnung dazu setzt der Zeitstrahl unter die Karte.
 */
const CHIPS = [
  {
    icon: CheckCircle2,
    label: NACHWEIS_WORTE.finanzierungBestaetigt,
    klasse: "bg-success/10 text-success",
  },
  {
    icon: Video,
    label: TERMIN_ARTEN.videogespraech.label,
    klasse: "bg-surface-tint text-primary",
  },
] as const;

export default function AppointmentCard() {
  const ref = useRef<HTMLDivElement>(null);
  /* OHNE JAVASCRIPT STEHT DIE FERTIGE KARTE (Runde 32): `on` kam
     frueher aus useInView, der auf dem Server immer false meldet, also
     lieferte das Server-HTML Datum, Zeile und Merkmale mit Deckkraft 0
     aus. Siehe lib/einblenden.ts. */
  const zustand = useEinblendung(ref, "-18% 0px");
  const on = zustand !== "versteckt";
  const bewegt = zustand === "an";

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="w-full max-w-[350px] rounded-2xl border border-line/70 bg-paper p-6"
      style={{
        boxShadow:
          "0 1px 2px rgba(35, 39, 42, 0.05), 8px 22px 40px -22px rgba(35, 39, 42, 0.28)",
      }}
    >
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        Nächste Besichtigung
      </p>
      <div className="mt-4 flex items-center gap-3.5">
        {/* Das Datum stempelt einmal kurz auf */}
        <m.div
          className="rounded-xl bg-surface-tint px-3.5 py-2 text-center"
          initial={false}
          animate={{ scale: on ? 1 : 0.7, opacity: on ? 1 : 0 }}
          transition={
            bewegt ? { type: "spring", stiffness: 260, damping: 17 } : { duration: 0 }
          }
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-primary">Sa</p>
          <p className="text-xl font-semibold tabular-nums leading-tight">12</p>
        </m.div>
        <m.div
          initial={false}
          animate={{ opacity: on ? 1 : 0, y: on ? 0 : 6 }}
          transition={bewegt ? { duration: 0.4, delay: 0.12 } : { duration: 0 }}
        >
          <p className="text-[0.95rem] font-semibold leading-tight">Samstag, 11:00 Uhr</p>
          <p className="mt-0.5 text-[0.82rem] text-ink-muted">Familie Berger</p>
        </m.div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line/60 pt-4">
        {CHIPS.map((chip, i) => (
          <m.span
            key={chip.label}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.75rem] font-medium ${chip.klasse}`}
            initial={false}
            animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.85 }}
            transition={
              bewegt
                ? { type: "spring", stiffness: 220, damping: 16, delay: 0.3 + i * 0.16 }
                : { duration: 0 }
            }
          >
            <chip.icon size={13} strokeWidth={2} />
            {chip.label}
          </m.span>
        ))}
      </div>
    </div>
  );
}
