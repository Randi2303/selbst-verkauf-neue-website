"use client";

import { m } from "framer-motion";
import { Send } from "lucide-react";
import { PORTALE } from "@/config/portale";
import { nutztReduzierteBewegung } from "@/lib/reduzierte-bewegung";

/*
 * Schritt 3 im Zeitstrahl. Die Vorgaengerin zeigte drei gruene
 * "Live"-Punkte, waehrend die Portal-Uebertragung nicht gebaut ist:
 * eine der drei Unwahrheiten aus der Bestandsaufnahme vom 23.08.2026.
 *
 * Diese Karte zeigt stattdessen den ehrlichen Zustand des Produkts:
 * "Bereit fuer die Portale" gibt es woertlich auf /konto/statistiken
 * (fehlendePortalPflicht), und die drei Haken stehen fuer Pflichten,
 * die im Gesetz stehen, nicht fuer unsere Bauweise.
 */
const PFLICHTEN = [
  "Energieangaben nach GEG vollständig",
  "Titelbild und Fotos ausgewählt",
  "Objekttexte erstellt und durchgesehen",
];

export default function PortaleBereitKarte({ active }: { active: boolean }) {
  /* Hydrationssicher (Runde 31): initial ist konstant, die Einstellung
     kommt vom Nach-Mount-Haken, sonst weicht das Server-Markup ab. */
  const reduced = nutztReduzierteBewegung();
  const on = active || reduced;

  return (
    <div
      aria-hidden="true"
      className="w-full max-w-[350px] rounded-2xl border border-line/70 bg-paper p-6"
      style={{
        boxShadow:
          "0 1px 2px rgba(35, 39, 42, 0.05), 8px 22px 40px -22px rgba(35, 39, 42, 0.28)",
      }}
    >
      <p className="flex items-center gap-2 text-[0.9rem] font-semibold">
        <Send size={15} strokeWidth={1.5} className="text-primary" />
        Bereit für die Portale
      </p>
      <ul className="mt-4 space-y-2.5">
        {PFLICHTEN.map((pflicht, i) => (
          <li key={pflicht} className="flex items-center gap-2.5 text-[0.85rem]">
            {/* Die Haken zeichnen sich nacheinander, genau einmal */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              className="shrink-0 text-success"
            >
              <m.path
                d="M4 12.5 9.5 18 20 6.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: on ? 1 : 0 }}
                transition={{ duration: reduced ? 0 : 0.22, delay: reduced ? 0 : 0.25 + i * 0.12, ease: "easeOut" }}
              />
            </svg>
            {pflicht}
          </li>
        ))}
      </ul>
      <m.p
        className="mt-5 border-t border-line/60 pt-4 text-[0.78rem] leading-relaxed text-ink-muted"
        initial={false}
        animate={{ opacity: on ? 1 : 0.4 }}
        transition={{ duration: 0.4, delay: on && !reduced ? 0.6 : 0 }}
      >
        Ein Inserat, drei Portale, ein Posteingang.
        <span className="mt-0.5 block text-ink">{PORTALE.map((p) => p.name).join(" · ")}</span>
      </m.p>
    </div>
  );
}
