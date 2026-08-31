"use client";

import { m } from "framer-motion";
import { useEinblendung } from "@/lib/einblenden";
import { useRef } from "react";
import { TelefonRahmen } from "@/components/mockups/Geraete";
import { NACHWEIS_WORTE } from "@/config/nachweis-woerter";

/*
 * Das Anfragen-Motiv: EIN Moment, kein Bestand (Inhaber, 23.08.2026:
 * "Zeigen Sie den Moment, nicht die Liste"). Eine Anfrage traegt das
 * eine Wort, um das es geht, und das kommt aus lib/bonitaet.ts:
 * nachweisBezeichnung liefert "Finanzierung bestätigt". Der Code dort
 * lehnt "Bonitaet nachgewiesen" ausdruecklich ab, deshalb wird das
 * Wort importiert und nicht abgeschrieben.
 *
 * Die Nachbarzeilen sind echter Inhalt, der weich in den Rand
 * auslaeuft: die Anschnittsprache der Seite, keine Ladeplatzhalter.
 *
 * Choreografie (einmal, erst beim Hinsehen; ohne JavaScript und bei
 * reduzierter Bewegung steht sofort der Endzustand):
 * Die Karte gleitet herein, kurze Ruhe, dann erscheint der Chip mit
 * leichtem Groessenaufbau und der Haken zeichnet sich.
 */

const CHIP_WORT = NACHWEIS_WORTE.finanzierungBestaetigt;

function NachbarZeile({
  initialen,
  name,
  zeile,
  zeit,
  richtung,
}: {
  initialen: string;
  name: string;
  zeile: string;
  zeit: string;
  richtung: "oben" | "unten";
}) {
  const maske =
    richtung === "oben"
      ? "linear-gradient(180deg, transparent, #000 65%)"
      : "linear-gradient(0deg, transparent 8%, #000 78%)";
  return (
    <div
      className="px-3.5 opacity-45"
      style={{ WebkitMaskImage: maske, maskImage: maske }}
    >
      <div className="flex items-center gap-2.5 border-b border-line/60 px-1.5 py-3 last:border-b-0">
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-surface-tint text-[0.7rem] font-semibold text-primary">
          {initialen}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.84rem] font-medium">{name}</span>
          <span className="block truncate text-[0.74rem] text-ink-muted">{zeile}</span>
        </span>
        <span className="shrink-0 text-[0.7rem] text-ink-muted">{zeit}</span>
      </div>
    </div>
  );
}

export default function AnfragenMoment() {
  const ref = useRef<HTMLDivElement>(null);
  /* OHNE JAVASCRIPT STEHT DER ENDZUSTAND (Runde 32): Frueher trugen
     die drei Stufen ein echtes `initial` mit Deckkraft 0, das der
     Server so auslieferte; ohne JavaScript blieb das Telefon halb
     leer. Jetzt liefert der Server den fertigen Moment, und erst nach
     dem Mount wird ausserhalb des Blickfelds zurueckgesetzt, damit die
     Choreografie beim Hinsehen einmal ablaeuft. Siehe
     lib/einblenden.ts. */
  const zustand = useEinblendung(ref, "-15% 0px");
  const on = zustand !== "versteckt";
  const bewegt = zustand === "an";

  return (
    <div ref={ref} aria-hidden="true" className="select-none">
      <TelefonRahmen>
        <p className="px-5 pb-3 pt-4 font-heading text-[1.2rem] font-semibold">Anfragen</p>

        <NachbarZeile
          initialen="RS"
          name="R. Sander"
          zeile="Besichtigung geplant"
          zeit="Montag"
          richtung="oben"
        />

        {/* Der eine Moment: gleitet einmal herein */}
        <m.div
          className="mx-3.5 my-3.5 rounded-[18px] border border-line/80 bg-paper p-[17px]"
          style={{
            boxShadow:
              "0 2px 4px rgba(35, 39, 42, 0.05), 0 18px 44px rgba(35, 39, 42, 0.12)",
          }}
          initial={false}
          animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={bewegt ? { duration: 0.38, delay: 0.3, ease: [0.23, 1, 0.32, 1] } : { duration: 0 }}
        >
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-tint text-[0.78rem] font-semibold text-primary sm:h-10 sm:w-10">
              FB
            </span>
            <span className="min-w-0 flex-1">
              <span className="block whitespace-nowrap text-[0.94rem] font-semibold">
                Familie Berger
              </span>
              <span className="hidden truncate text-[0.78rem] text-ink-muted sm:block">
                Guten Tag, wir würden die Wohnung gern besichtigen …
              </span>
            </span>
            <span className="hidden shrink-0 text-[0.72rem] text-ink-muted sm:block">12:41</span>
          </div>
          <div className="mt-3">
            {/* Der Chip erscheint mit Groessenaufbau, der Haken zeichnet sich */}
            <m.span
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-success/10 px-3.5 py-[7px] text-[0.78rem] font-medium text-success sm:text-[0.85rem]"
              initial={false}
              animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={bewegt ? { duration: 0.24, delay: 1.05, ease: [0.23, 1, 0.32, 1] } : { duration: 0 }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <m.path
                  d="M4 12.5 9.5 18 20 6.5"
                  initial={false}
                  animate={on ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={bewegt ? { duration: 0.26, delay: 1.13, ease: "easeOut" } : { duration: 0 }}
                />
              </svg>
              {CHIP_WORT}
            </m.span>
          </div>
        </m.div>

        <div>
          <NachbarZeile
            initialen="TW"
            name="T. Winter"
            zeile="Ist der Termin am Samstag noch frei?"
            zeit="Gestern"
            richtung="unten"
          />
          <NachbarZeile
            initialen="MK"
            name="M. Krüger"
            zeile="Frage zum Energieausweis"
            zeit="Montag"
            richtung="unten"
          />
        </div>
      </TelefonRahmen>
    </div>
  );
}
